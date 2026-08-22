import { useMemo, useState } from "react";
import { BookGrid } from "../components/books/BookGrid";
import { Seo } from "../components/Seo";
import { Field, Select, TextInput } from "../components/ui/Field";
import {
  getBooksByCategory,
  searchBooks,
} from "../data/books";
import { useLanguage } from "../i18n/LanguageContext";
import type { CategoryId } from "../types/book";
import { useContent } from "../context/ContentContext";

export function BooksPage() {
  const { t, loc, lang } = useLanguage();
  const { books, categories } = useContent();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");

  const visible = useMemo(() => {
    let result = searchBooks(query, lang, books, categories);
    if (category !== "all") {
      result = result.filter((b) => b.category === category);
    }
    return result;
  }, [query, category, lang, books, categories]);

  return (
    <>
      <Seo title={t("navBooks")} description={t("seoBooks")} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-serif text-4xl">{t("allBooks")}</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field label={t("search")} htmlFor="q">
            <TextInput
              id="q"
              type="search"
              placeholder={t("searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label={t("filterCategory")} htmlFor="cat">
            <Select
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId | "all")}
            >
              <option value="all">{t("allCategories")}</option>
              {categories.filter((c) => c.visible !== false).map((c) => (
                <option key={c.id} value={c.id}>
                  {loc(c.name)} ({getBooksByCategory(c.id, books).length})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mb-4 mt-6 text-sm text-stone-500" aria-live="polite">
          {t("showing")} {visible.length} / {books.length}
        </p>
        <BookGrid books={visible} />
      </div>
    </>
  );
}
