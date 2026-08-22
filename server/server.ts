import "dotenv/config";
import { randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { loadContent, saveContent, sanitizeBook, validateBook } from "./contentStore";

const app = express();
const port = Number(process.env.PORT || 3001);
const ownerEmail = process.env.OWNER_EMAIL || "dev.get.in.touch@gmail.com";
let orderSequence = 0;
const sessions = new Map<string, number>();
const adminEmail = (process.env.ADMIN_EMAIL || ownerEmail).toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

app.use(express.json({ limit: "16kb" }));
app.get("/api/content", async (_req, res) => {
  res.json(await loadContent());
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
function parseCookies(value: string | undefined): Record<string, string> {
  return Object.fromEntries((value || "").split(";").map((part) => part.trim().split("=")).filter(([key, token]) => key && token));
}

function isAdmin(req: express.Request): boolean {
  const token = parseCookies(req.headers.cookie).canvix_admin;
  const expiresAt = token ? sessions.get(token) : undefined;
  if (!expiresAt || expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return false;
  }
  return true;
}

app.post("/api/admin/login", authLimiter, (req, res) => {
  const email = clean(req.body?.email, 254).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const validEmail = email === adminEmail;
  const validPassword = adminPassword ? (() => {
    const left = Buffer.from(password);
    const right = Buffer.from(adminPassword);
    return left.length === right.length && timingSafeEqual(left, right);
  })() : false;
  if (!validEmail || !validPassword) return res.status(401).json({ error: "Invalid admin credentials." });
  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.setHeader("Set-Cookie", `canvix_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return res.json({ authenticated: true });
});

app.post("/api/admin/logout", (req, res) => {
  const token = parseCookies(req.headers.cookie).canvix_admin;
  if (token) sessions.delete(token);
  res.setHeader("Set-Cookie", "canvix_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
  return res.status(204).send();
});

app.get("/api/admin/session", (req, res) => res.json({ authenticated: isAdmin(req) }));

app.put("/api/admin/content", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Authentication required." });
  const incoming = req.body as { version?: unknown; books?: unknown; paymentNumbers?: unknown };
  if (!Number.isInteger(incoming.version) || !Array.isArray(incoming.books) || !incoming.paymentNumbers) {
    return res.status(400).json({ error: "Invalid content payload." });
  }
  const current = await loadContent();
  if (incoming.version !== current.version) return res.status(409).json({ error: "Content changed. Reload and try again." });
  if (!incoming.books.every(validateBook)) return res.status(400).json({ error: "One or more books are invalid." });
  const numbers = incoming.paymentNumbers as Record<string, unknown>;
  if (!/^01[3-9]\d{8}$/.test(String(numbers.bkash)) || !/^01[3-9]\d{8}$/.test(String(numbers.rocket))) {
    return res.status(400).json({ error: "Payment numbers are invalid." });
  }
  const next = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    books: incoming.books.map((book) => sanitizeBook(book)),
    paymentNumbers: { bkash: String(numbers.bkash), rocket: String(numbers.rocket) } as typeof current.paymentNumbers,
  };
  await saveContent(next);
  return res.json(next);
});
app.use(
  "/api/orders",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }),
);

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength) : "";
}

function nextOrderId(): string {
  orderSequence += 1;
  const date = new Date().getFullYear();
  return `CANVIX-${date}-${String(orderSequence).padStart(6, "0")}`;
}

app.post("/api/orders", async (req, res) => {
  const content = await loadContent();
  const body = req.body as Record<string, unknown>;
  const fullName = clean(body.fullName, 100);
  const gmail = clean(body.gmail, 254).toLowerCase();
  const bookSlug = clean(body.bookSlug, 120);
  const paymentMethod = clean(body.paymentMethod, 20);
  const senderMobile = clean(body.senderMobile, 20);
  const transactionId = clean(body.transactionId, 100);
  const customerMessage = clean(body.customerMessage, 1000);
  const paymentAmount = Number(body.paymentAmount);
  const book = content.books.find((entry) => entry.slug === bookSlug);

  if (clean(body.company, 100) || Number(body.formStartedAt) > 0 && Date.now() - Number(body.formStartedAt) < 2000) {
    return res.status(400).json({ error: "Invalid submission." });
  }
  if (!fullName || !/^[^\s@]+@(gmail|googlemail)\.com$/i.test(gmail) || !book) {
    return res.status(400).json({ error: "Please provide valid customer and book information." });
  }
  if (!(paymentMethod === "bkash" || paymentMethod === "rocket")) {
    return res.status(400).json({ error: "Please select a valid payment method." });
  }
  if (!/^01[3-9]\d{8}$/.test(senderMobile) || transactionId.length < 4 || paymentAmount !== book.priceBdt) {
    return res.status(400).json({ error: "Please check your payment information." });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(503).json({ error: "Order service is not configured yet." });
  }

  const orderId = nextOrderId();
  const submittedAt = new Date().toISOString();
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: smtpUser,
      to: ownerEmail,
      replyTo: gmail,
      subject: `New Canvix Store Order — ${book.title.en} — ${transactionId}`,
      text: [
        "Canvix Store — New Order",
        `Order ID: ${orderId}`,
        `Customer Name: ${fullName}`,
        `Customer Gmail: ${gmail}`,
        `Selected Book: ${book.title.en}`,
        `Book Price: BDT ${book.priceBdt}`,
        `Payment Method: ${paymentMethod}`,
        `Sender Mobile Number: ${senderMobile}`,
        `Transaction ID: ${transactionId}`,
        `Payment Amount: BDT ${paymentAmount}`,
        `Customer Message: ${customerMessage || "None"}`,
        `Order Submission Date/Time: ${submittedAt}`,
      ].join("\n"),
    });
    return res.status(201).json({ orderId });
  } catch (error) {
    console.error("Order email failed", error);
    return res.status(502).json({ error: "Could not send the order. Please try again later." });
  }
});

app.listen(port, () => {
  console.log(`Canvix Store API listening on http://localhost:${port}`);
});
