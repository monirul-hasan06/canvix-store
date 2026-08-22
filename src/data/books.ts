import type { Book, CategoryId, Localized } from "../types/book";

export const categories: { id: CategoryId; name: Localized }[] = [
  { id: "self-development", name: { bn: "আত্মউন্নয়ন", en: "Self Development" } },
  { id: "programming", name: { bn: "প্রোগ্রামিং", en: "Programming" } },
  { id: "web-development", name: { bn: "ওয়েব ডেভেলপমেন্ট", en: "Web Development" } },
  { id: "business", name: { bn: "ব্যবসা", en: "Business" } },
  { id: "education", name: { bn: "শিক্ষা", en: "Education" } },
  { id: "technology", name: { bn: "প্রযুক্তি", en: "Technology" } },
  { id: "productivity", name: { bn: "প্রোডাক্টিভিটি", en: "Productivity" } },
  { id: "career", name: { bn: "ক্যারিয়ার", en: "Career" } },
  { id: "other", name: { bn: "অন্যান্য", en: "Other" } },
];

export function getCategoryName(id: CategoryId): Localized {
  return categories.find((c) => c.id === id)?.name ?? { bn: id, en: id };
}

/**
 * Add a new book by appending an object here.
 * Put the cover in /public/covers. Do not put PDFs in /public.
 */
export const books: Book[] = [
  {
    id: "alpha-male-001",
    slug: "how-to-be-an-alpha-male",
    title: {
      bn: "হাউ টু বি অ্যান আলফা মেল",
      en: "How to Be an Alpha Male",
    },
    author: { bn: "ক্যানভিক্স প্রেস", en: "Canvix Press" },
    coverImage: "/covers/how-to-be-an-alpha-male.svg",
    shortDescription: {
      bn: "আত্মবিশ্বাস, উপস্থিতি ও দৈনন্দিন নেতৃত্ব নিয়ে একটি সংক্ষিপ্ত ডিজিটাল গাইড।",
      en: "A concise digital guide to confidence, presence, and everyday leadership.",
    },
    longDescription: {
      bn: "হাউ টু বি অ্যান আলফা মেল একটি ব্যবহারিক আত্ম-দক্ষতা গাইড। বাক্য নয়, অভ্যাস—কাজের জায়গায়, সম্পর্কে ও দৈনন্দিন জীবনে শান্ত আত্মবিশ্বাস গড়ে তোলার জন্য সহজ অনুশীলন। প্রতিটি অধ্যায় একই দিনে প্রয়োগ করা যায়।",
      en: "How to Be an Alpha Male is a practical self-mastery handbook. It focuses on habits you can use at work, in relationships, and in daily life: presence, discipline, voice, and boundaries. Each chapter ends with a short practice you can complete the same day.",
    },
    receives: {
      bn: "পেমেন্ট যাচাইয়ের পর আপনার দেওয়া জিমেইলে মালিক নিজে পিডিএফ পাঠাবেন। ওয়েবসাইট থেকে ফাইল ডাউনলোড হয় না।",
      en: "After the owner verifies your payment, the PDF is sent manually to the Gmail you provide. There is no download from this website.",
    },
    priceBdt: 50,
    category: "self-development",
    tags: [
      { bn: "আত্মউন্নয়ন", en: "self-improvement" },
      { bn: "আত্মবিশ্বাস", en: "confidence" },
    ],
    pages: 64,
    fileSize: "2.4 MB",
    language: { bn: "ইংরেজি", en: "English" },
    format: "PDF",
    featured: true,
    newArrival: true,
  },
];

export function getBookBySlug(slug: string, catalog = books): Book | undefined {
  return catalog.find((book) => book.slug === slug);
}

export function getBookById(id: string, catalog = books): Book | undefined {
  return catalog.find((book) => book.id === id);
}

export function getFeaturedBooks(catalog = books): Book[] {
  return catalog.filter((book) => book.featured);
}

export function getBooksByCategory(id: CategoryId, catalog = books): Book[] {
  return catalog.filter((book) => book.category === id);
}

export function getRelatedBooks(book: Book, limit = 3, catalog = books): Book[] {
  const same = catalog.filter((b) => b.id !== book.id && b.category === book.category);
  const rest = catalog.filter((b) => b.id !== book.id && b.category !== book.category);
  return [...same, ...rest].slice(0, limit);
}

export function discountPercent(book: Book): number | null {
  if (!book.originalPriceBdt || book.originalPriceBdt <= book.priceBdt) return null;
  return Math.round((1 - book.priceBdt / book.originalPriceBdt) * 100);
}

export function searchBooks(query: string, lang: "bn" | "en", catalog = books): Book[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;
  return catalog.filter((book) => {
    const hay = [
      book.title[lang],
      book.title.en,
      book.author[lang],
      book.shortDescription[lang],
      getCategoryName(book.category)[lang],
      ...book.tags.map((t) => t[lang]),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
