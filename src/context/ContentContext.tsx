import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { books as fallbackBooks } from "../data/books";
import { PAYMENT_NUMBERS } from "../data/site";
import type { Book } from "../types/book";

export type Category = { id: string; name: { bn: string; en: string } };

type Content = {
  version: number;
  updatedAt: string;
  books: Book[];
  categories: Category[];
  paymentNumbers: typeof PAYMENT_NUMBERS;
  showCategories: boolean;
};

const fallbackContent: Content = {
  version: 0,
  updatedAt: "",
  books: fallbackBooks,
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
};

const ContentContext = createContext<Content>(fallbackContent);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content>(fallbackContent);

  useEffect(() => {
    fetch("/api/content")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Content unavailable"))))
      .then((data: Content) => setContent(data))
      .catch(() => undefined);
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext);
}
