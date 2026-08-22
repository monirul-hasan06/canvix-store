import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { books as seedBooks } from "../src/data/books";
import { PAYMENT_NUMBERS } from "../src/data/site";
import type { Book } from "../src/types/book";

export type Category = { id: string; name: { bn: string; en: string } };

export type ContentStore = {
  version: number;
  updatedAt: string;
  books: Book[];
  categories: Category[];
  paymentNumbers: typeof PAYMENT_NUMBERS;
  showCategories: boolean;
};

const storePath = resolve(process.env.CONTENT_STORE_PATH || "server/data/content.json");

const initialStore = (): ContentStore => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  books: seedBooks,
  categories: [
    { id: "self-development", name: { bn: "আত্মউন্নয়ন", en: "Self Development" } },
    { id: "programming", name: { bn: "প্রোগ্রামিং", en: "Programming" } },
    { id: "web-development", name: { bn: "ওয়েব ডেভেলপমেন্ট", en: "Web Development" } },
    { id: "business", name: { bn: "ব্যবসা", en: "Business" } },
    { id: "education", name: { bn: "শিক্ষা", en: "Education" } },
    { id: "technology", name: { bn: "প্রযুক্তি", en: "Technology" } },
    { id: "productivity", name: { bn: "প্রোডাক্টিভিটি", en: "Productivity" } },
    { id: "career", name: { bn: "ক্যারিয়ার", en: "Career" } },
    { id: "other", name: { bn: "অন্যান্য", en: "Other" } },
  ],
  paymentNumbers: PAYMENT_NUMBERS,
  showCategories: true,
});

export async function loadContent(): Promise<ContentStore> {
  try {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as ContentStore;
    if (!Array.isArray(parsed.books) || !Array.isArray(parsed.categories) || !parsed.paymentNumbers) throw new Error("Invalid content store");
    return { ...parsed, showCategories: parsed.showCategories !== false };
  } catch {
    const seeded = initialStore();
    await saveContent(seeded);
    return seeded;
  }
}

export async function saveContent(content: ContentStore): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  await rename(temporaryPath, storePath);
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
  };
}
