import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { books as fallbackBooks } from "../data/books";
import { PAYMENT_NUMBERS } from "../data/site";
import type { Book } from "../types/book";

type Content = {
  version: number;
  updatedAt: string;
  books: Book[];
  paymentNumbers: typeof PAYMENT_NUMBERS;
};

const fallbackContent: Content = {
  version: 0,
  updatedAt: "",
  books: fallbackBooks,
  paymentNumbers: PAYMENT_NUMBERS,
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
