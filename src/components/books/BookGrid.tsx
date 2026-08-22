import { useLanguage } from "../../i18n/LanguageContext";
import type { Book } from "../../types/book";
import { BookCard } from "./BookCard";

export function BookGrid({ books }: { books: Book[] }) {
  const { t } = useLanguage();

  if (books.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-stone-600">
        {t("noBooks")}
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {books.map((book) => (
        <li key={book.id}>
          <BookCard book={book} />
        </li>
      ))}
    </ul>
  );
}
