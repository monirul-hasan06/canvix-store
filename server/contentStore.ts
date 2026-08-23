import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getStore } from "@netlify/blobs";
import { books as seedBooks } from "../src/data/books";
import { DEFAULT_PAYMENT_METHODS, type PaymentOption } from "../src/data/site";
import { type SiteCopy } from "../src/i18n/dictionary";
import type { Book } from "../src/types/book";

export type Category = { id: string; name: { bn: string; en: string }; visible?: boolean };

export type ContentStore = {
  version: number;
  updatedAt: string;
  books: Book[];
  categories: Category[];
  paymentMethods: PaymentOption[];
  showCategories: boolean;
  showOrderSubmit: boolean;
  showWhatsAppSubmit: boolean;
  showGmailSubmit: boolean;
  siteCopy: SiteCopy;
};

const storePath = resolve(process.env.CONTENT_STORE_PATH || "server/data/content.json");
const durableStore = process.env.NETLIFY ? getStore({ name: "canvix-content", consistency: "strong" }) : null;

const initialStore = (): ContentStore => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  books: seedBooks,
  categories: [
    { id: "self-development", name: { bn: "আত্মউন্নয়ন", en: "Self Development" }, visible: true },
    { id: "programming", name: { bn: "প্রোগ্রামিং", en: "Programming" } },
    { id: "web-development", name: { bn: "ওয়েব ডেভেলপমেন্ট", en: "Web Development" } },
    { id: "business", name: { bn: "ব্যবসা", en: "Business" } },
    { id: "education", name: { bn: "শিক্ষা", en: "Education" } },
    { id: "technology", name: { bn: "প্রযুক্তি", en: "Technology" } },
    { id: "productivity", name: { bn: "প্রোডাক্টিভিটি", en: "Productivity" } },
    { id: "career", name: { bn: "ক্যারিয়ার", en: "Career" } },
    { id: "other", name: { bn: "অন্যান্য", en: "Other" } },
  ],
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  showCategories: true,
  showOrderSubmit: true,
  showWhatsAppSubmit: true,
  showGmailSubmit: true,
  siteCopy: {},
});

export async function loadContent(): Promise<ContentStore> {
  try {
    if (durableStore) {
      const stored = await durableStore.get("content", { type: "json" }) as ContentStore | null;
      if (stored) return normalizeContent(stored);
    }
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as ContentStore;
    return normalizeContent(parsed);
  } catch {
    const seeded = initialStore();
    if (!process.env.VERCEL) await saveContent(seeded);
    return seeded;
  }
}

export async function saveContent(content: ContentStore): Promise<void> {
  if (durableStore) {
    await durableStore.setJSON("content", content);
    return;
  }
  await mkdir(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  await rename(temporaryPath, storePath);
}

function normalizeContent(parsed: ContentStore): ContentStore {
  if (!Array.isArray(parsed.books) || !Array.isArray(parsed.categories)) throw new Error("Invalid content store");
  const legacy = (parsed as ContentStore & { paymentNumbers?: Record<string, string> }).paymentNumbers;
  const paymentMethods = Array.isArray(parsed.paymentMethods) ? parsed.paymentMethods : Object.entries(legacy || {}).map(([id, number]) => ({ id, name: id === "bkash" ? "bKash" : id === "rocket" ? "Rocket" : id, number, enabled: true }));
  if (!paymentMethods.length) throw new Error("Invalid payment methods");
  const categories = parsed.categories.map((category) => ({ ...category, visible: category.visible !== false }));
  const books = parsed.books.map((book) => ({ ...book, visible: book.visible !== false }));
  return { ...parsed, books, categories, paymentMethods, siteCopy: parsed.siteCopy || {}, showCategories: parsed.showCategories !== false, showOrderSubmit: parsed.showOrderSubmit !== false, showWhatsAppSubmit: parsed.showWhatsAppSubmit !== false, showGmailSubmit: parsed.showGmailSubmit !== false };
}

export function validateBook(value: unknown): value is Book {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<Book>;
  return Boolean(
    typeof book.id === "string" &&
      typeof book.slug === "string" &&
      book.title && typeof book.title.bn === "string" && typeof book.title.en === "string" &&
      book.author && typeof book.author.bn === "string" && typeof book.author.en === "string" &&
      book.shortDescription && typeof book.shortDescription.bn === "string" && typeof book.shortDescription.en === "string" &&
      book.longDescription && typeof book.longDescription.bn === "string" && typeof book.longDescription.en === "string" &&
      book.receives && typeof book.receives.bn === "string" && typeof book.receives.en === "string" &&
      typeof book.coverImage === "string" && /^\/(covers|assets)\/[a-zA-Z0-9._/-]+$/.test(book.coverImage) &&
      typeof book.priceBdt === "number" && Number.isFinite(book.priceBdt) && book.priceBdt >= 0 &&
      typeof book.category === "string" && Array.isArray(book.tags) &&
      typeof book.pages === "number" && Number.isInteger(book.pages) && book.pages >= 0 &&
      typeof book.fileSize === "string" && book.language &&
      typeof book.language.bn === "string" && typeof book.language.en === "string" &&
      book.format === "PDF" && typeof book.featured === "boolean" && typeof book.newArrival === "boolean",
  );
}

export function sanitizeBook(value: Book): Book {
  const trimLocalized = (localized: { bn: string; en: string }) => ({
    bn: localized.bn.trim().slice(0, 4000),
    en: localized.en.trim().slice(0, 4000),
  });
  return {
    ...value,
    id: value.id.trim().slice(0, 120),
    slug: value.slug.trim().toLowerCase().slice(0, 120),
    title: trimLocalized(value.title),
    author: trimLocalized(value.author),
    coverImage: value.coverImage.trim().slice(0, 300),
    shortDescription: trimLocalized(value.shortDescription),
    longDescription: trimLocalized(value.longDescription),
    receives: trimLocalized(value.receives),
    tags: value.tags.slice(0, 20).map(trimLocalized),
    fileSize: value.fileSize.trim().slice(0, 40),
    language: trimLocalized(value.language),
    priceBdt: Math.round(value.priceBdt * 100) / 100,
    visible: value.visible !== false,
  };
}
