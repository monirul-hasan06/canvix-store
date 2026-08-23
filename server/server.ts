import "dotenv/config";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { loadContent, saveContent, sanitizeBook, validateBook } from "./contentStore";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const app = express();
const port = Number(process.env.PORT || 3001);
const orderRecipient = process.env.ORDER_RECIPIENT || process.env["OWNER_" + "EMAIL"];
const adminEmail = (process.env.ADMIN_EMAIL || orderRecipient || "").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

app.use(express.json({ limit: "8mb" }));
app.get("/api/content", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.json(await loadContent());
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: false, legacyHeaders: false });
function parseCookies(value: string | undefined): Record<string, string> {
  return Object.fromEntries((value || "").split(";").map((part) => part.trim().split("=")).filter(([key, token]) => key && token));
}

function isAdmin(req: express.Request): boolean {
  const token = parseCookies(req.headers.cookie).canvix_admin;
  if (!token || !sessionSecret) return false;
  const [expiresAtValue, nonce, signature] = token.split(".");
  const expiresAt = Number(expiresAtValue);
  if (!nonce || !signature || !Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
  const expected = signSession(`${expiresAt}.${nonce}`);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function signSession(value: string): string {
  return createHmac("sha256", sessionSecret || "").update(value).digest("hex");
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
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const sessionValue = `${expiresAt}.${randomBytes(32).toString("hex")}`;
  const token = `${sessionValue}.${signSession(sessionValue)}`;
  res.setHeader("Set-Cookie", `canvix_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return res.json({ authenticated: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.setHeader("Set-Cookie", "canvix_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
  return res.status(204).send();
});

app.get("/api/admin/session", (req, res) => res.json({ authenticated: isAdmin(req) }));

app.put("/api/admin/content", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Authentication required." });
  const incoming = req.body as { version?: unknown; books?: unknown; categories?: unknown; paymentMethods?: unknown; showCategories?: unknown; showOrderSubmit?: unknown; siteCopy?: unknown };
  if (!Number.isInteger(incoming.version) || !Array.isArray(incoming.books) || !Array.isArray(incoming.categories) || !Array.isArray(incoming.paymentMethods) || !incoming.siteCopy || typeof incoming.siteCopy !== "object" || typeof incoming.showCategories !== "boolean" || typeof incoming.showOrderSubmit !== "boolean") {
    return res.status(400).json({ error: "Invalid content payload." });
  }
  const current = await loadContent();
  if (incoming.version !== current.version) return res.status(409).json({ error: "Content changed. Reload and try again." });
  if (!incoming.books.every(validateBook) || !incoming.categories.every((category) => category && typeof category === "object" && typeof (category as { id?: unknown }).id === "string" && (category as { name?: { bn?: unknown; en?: unknown } }).name && typeof (category as { name: { bn?: unknown; en?: unknown } }).name.bn === "string" && typeof (category as { name: { bn?: unknown; en?: unknown } }).name.en === "string")) return res.status(400).json({ error: "Catalog or categories are invalid." });
  const categories = incoming.categories as { id: string; name: { bn: string; en: string }; visible?: unknown }[];
  if (new Set(categories.map((category) => category.id)).size !== categories.length || incoming.books.some((book) => !categories.some((category) => category.id === (book as { category?: unknown }).category))) {
    return res.status(400).json({ error: "Every book must use one unique existing category." });
  }
  const paymentMethods = incoming.paymentMethods as { id?: unknown; name?: unknown; number?: unknown; enabled?: unknown }[];
  if (!paymentMethods.length || new Set(paymentMethods.map((method) => method.id)).size !== paymentMethods.length || paymentMethods.some((method) => !/^[a-z0-9-]{2,40}$/.test(String(method.id)) || !String(method.name).trim() || !/^01[3-9]\d{8}$/.test(String(method.number)) || typeof method.enabled !== "boolean")) {
    return res.status(400).json({ error: "Payment methods are invalid." });
  }
  const next = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    books: incoming.books.map((book) => sanitizeBook(book)),
    categories: categories.map((category) => ({ id: category.id.trim().slice(0, 100), name: { bn: category.name.bn.trim().slice(0, 200), en: category.name.en.trim().slice(0, 200) }, visible: category.visible !== false })),
    paymentMethods: paymentMethods.map((method) => ({ id: String(method.id).trim().toLowerCase(), name: String(method.name).trim().slice(0, 80), number: String(method.number), enabled: method.enabled === true })),
    showCategories: incoming.showCategories,
    showOrderSubmit: incoming.showOrderSubmit,
    siteCopy: Object.fromEntries(Object.entries(incoming.siteCopy as Record<string, unknown>).filter(([key, value]) => /^[a-zA-Z0-9]+$/.test(key) && value && typeof value === "object").map(([key, value]) => { const copy = value as { bn?: unknown; en?: unknown }; return [key, { bn: String(copy.bn || "").slice(0, 4000), en: String(copy.en || "").slice(0, 4000) }]; })),
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
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: false, legacyHeaders: false }),
);

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength) : "";
}

app.post("/api/contact", async (req, res) => {
  const name = clean(req.body?.name, 100);
  const email = clean(req.body?.email, 254).toLowerCase();
  const message = clean(req.body?.message, 2000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
    return res.status(400).json({ error: "Please provide your name, email, and message." });
  }

  const mailHost = process.env.MAIL_HOST || process.env["SMTP_" + "HOST"];
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (!mailHost || !smtpUser || !smtpPass || !orderRecipient) {
    return res.status(503).json({ error: "Contact service is not configured yet." });
  }

  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: smtpUser,
      to: orderRecipient,
      replyTo: email,
      subject: `Canvix Store contact message from ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    });
    return res.status(201).json({ sent: true });
  } catch (error) {
    console.error("Contact email failed", error);
    return res.status(502).json({ error: "Could not send your message. Please try again later." });
  }
});

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
  const book = content.books.find((entry) => entry.slug === bookSlug && entry.visible !== false);

  if (clean(body.company, 100) || Number(body.formStartedAt) > 0 && Date.now() - Number(body.formStartedAt) < 2000) {
    return res.status(400).json({ error: "Invalid submission." });
  }
  if (!fullName || !/^[^\s@]+@(gmail|googlemail)\.com$/i.test(gmail) || !book) {
    return res.status(400).json({ error: "Please provide valid customer and book information." });
  }
  const selectedPayment = content.paymentMethods.find((method) => method.id === paymentMethod && method.enabled);
  if (!selectedPayment) {
    return res.status(400).json({ error: "Please select a valid payment method." });
  }
  if (!/^01[3-9]\d{8}$/.test(senderMobile) || transactionId.length < 4 || paymentAmount !== book.priceBdt) {
    return res.status(400).json({ error: "Please check your payment information." });
  }

  const mailHost = process.env.MAIL_HOST || process.env["SMTP_" + "HOST"];
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (!mailHost || !smtpUser || !smtpPass || !orderRecipient) {
    return res.status(503).json({ error: "Order service is not configured yet." });
  }

  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.verify();
    const orderId = `CANVIX-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const submittedAt = new Date().toISOString();
    await transporter.sendMail({
      from: smtpUser,
      to: orderRecipient,
      replyTo: gmail,
      subject: `New Canvix Store Order — ${book.title.en} — ${transactionId}`,
      text: [
        "Canvix Store — New Order",
        `Order ID: ${orderId}`,
        `Customer Name: ${fullName}`,
        `Customer Gmail: ${gmail}`,
        `Selected Book: ${book.title.en}`,
        `Book Price: BDT ${book.priceBdt}`,
        `Payment Method: ${selectedPayment.name} (${paymentMethod})`,
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

if (!process.env.VERCEL && !process.env.NETLIFY) {
  app.listen(port, () => {
    console.log(`Canvix Store API listening on http://localhost:${port}`);
  });
}

export default app;
