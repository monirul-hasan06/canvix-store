import "dotenv/config";
import { randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { loadContent, saveContent, sanitizeBook, validateBook } from "./contentStore";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const app = express();
const port = Number(process.env.PORT || 3001);
const ownerEmail = process.env.OWNER_EMAIL || "dev.get.in.touch@gmail.com";
const sessions = new Map<string, number>();
const adminEmail = (process.env.ADMIN_EMAIL || ownerEmail).toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

app.use(express.json({ limit: "8mb" }));
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
  const incoming = req.body as { version?: unknown; books?: unknown; categories?: unknown; paymentNumbers?: unknown; showCategories?: unknown };
  if (!Number.isInteger(incoming.version) || !Array.isArray(incoming.books) || !Array.isArray(incoming.categories) || !incoming.paymentNumbers || typeof incoming.showCategories !== "boolean") {
    return res.status(400).json({ error: "Invalid content payload." });
  }
  const current = await loadContent();
  if (incoming.version !== current.version) return res.status(409).json({ error: "Content changed. Reload and try again." });
  if (!incoming.books.every(validateBook) || !incoming.categories.every((category) => category && typeof category === "object" && typeof (category as { id?: unknown }).id === "string" && (category as { name?: { bn?: unknown; en?: unknown } }).name && typeof (category as { name: { bn?: unknown; en?: unknown } }).name.bn === "string" && typeof (category as { name: { bn?: unknown; en?: unknown } }).name.en === "string")) return res.status(400).json({ error: "Catalog or categories are invalid." });
  const categories = incoming.categories as { id: string; name: { bn: string; en: string } }[];
  if (new Set(categories.map((category) => category.id)).size !== categories.length || incoming.books.some((book) => !categories.some((category) => category.id === (book as { category?: unknown }).category))) {
    return res.status(400).json({ error: "Every book must use one unique existing category." });
  }
  const numbers = incoming.paymentNumbers as Record<string, unknown>;
  if (!/^01[3-9]\d{8}$/.test(String(numbers.bkash)) || !/^01[3-9]\d{8}$/.test(String(numbers.rocket))) {
    return res.status(400).json({ error: "Payment numbers are invalid." });
  }
  const next = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    books: incoming.books.map((book) => sanitizeBook(book)),
    categories: categories.map((category) => ({ id: category.id.trim().slice(0, 100), name: { bn: category.name.bn.trim().slice(0, 200), en: category.name.en.trim().slice(0, 200) } })),
    paymentNumbers: { bkash: String(numbers.bkash), rocket: String(numbers.rocket) } as typeof current.paymentNumbers,
    showCategories: incoming.showCategories,
  };
  await saveContent(next);
  return res.json(next);
});

app.post("/api/admin/covers", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Authentication required." });
  const dataUrl = clean(req.body?.dataUrl, 8 * 1024 * 1024);
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ error: "Only PNG, JPEG, and WebP covers are supported." });
  const file = Buffer.from(match[2], "base64");
  if (file.length > 5 * 1024 * 1024) return res.status(400).json({ error: "Cover must be 5 MB or smaller." });
  const extension = match[1].split("/")[1].replace("jpeg", "jpg");
  const fileName = `cover-${randomBytes(12).toString("hex")}.${extension}`;
  await mkdir(resolve("public/covers"), { recursive: true });
  await writeFile(resolve("public/covers", fileName), file);
  return res.status(201).json({ coverPath: `/covers/${fileName}` });
});

app.use(
  "/api/orders",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }),
);

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength) : "";
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

  const orderId = `CANVIX-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const submittedAt = new Date().toISOString();
  const orderText = [
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
  ].join("\n");

  let emailSent = false;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.verify();
      await transporter.sendMail({
        from: smtpUser,
        to: ownerEmail,
        replyTo: gmail,
        subject: `New Canvix Store Order — ${book.title.en} — ${transactionId}`,
        text: orderText,
      });
      emailSent = true;
    } catch (error) {
      console.error("Order email failed; trying WhatsApp fallback", error);
    }
  }

  if (!emailSent) {
    const whatsappRecipient = "8801521796217";
    return res.status(202).json({
      orderId,
      deliveryMethod: "whatsapp",
      whatsappUrl: `https://wa.me/${whatsappRecipient}?text=${encodeURIComponent(orderText)}`,
      message: "Email delivery failed. WhatsApp has been prepared as a backup.",
    });
  }
  return res.status(201).json({ orderId, deliveryMethod: "email" });
});

app.use("/api", (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API request failed", error);
  if (!res.headersSent) res.status(500).json({ error: "The server could not complete this request." });
});

app.listen(port, () => {
  console.log(`Canvix Store API listening on http://localhost:${port}`);
});
