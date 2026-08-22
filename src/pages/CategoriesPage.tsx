import { Link, useParams } from "react-router-dom";
import { BookGrid } from "../components/books/BookGrid";
import { Seo } from "../components/Seo";
import { categories, getBooksByCategory } from "../data/books";
import { useLanguage } from "../i18n/LanguageContext";
import type { CategoryId } from "../types/book";
import { useContent } from "../context/ContentContext";

export function CategoriesPage() {
  const { t, loc } = useLanguage();
  const { books } = useContent();
  const { id } = useParams();
  const selected = categories.find((c) => c.id === id);

  if (id && !selected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Seo title={t("navCategories")} description={t("categoriesIntro")} />
        <h1 className="font-serif text-3xl">{t("notFound")}</h1>
        <Link to="/categories" className="mt-6 inline-block text-amber-800">
          {t("navCategories")}
        </Link>
      </div>
    );
  }

  if (selected) {
    const list = getBooksByCategory(selected.id as CategoryId, books);
    return (
      <>
        <Seo title={loc(selected.name)} description={t("categoriesIntro")} />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-sm text-amber-800">
            <Link to="/categories">{t("navCategories")}</Link>
          </p>
          <h1 className="mt-2 font-serif text-4xl">{loc(selected.name)}</h1>
          <p className="mb-8 mt-3 text-stone-600">
            {list.length} {t("booksInCategory")}
          </p>
          {list.length === 0 ? (
            <p className="text-stone-600">{t("emptyCategory")}</p>
          ) : (
            <BookGrid books={list} />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={t("navCategories")} description={t("categoriesIntro")} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-serif text-4xl">{t("categories")}</h1>
        <p className="mt-3 max-w-2xl text-stone-600">{t("categoriesIntro")}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/categories/${cat.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5 hover:shadow-md"
              >
                <p className="font-serif text-xl">{loc(cat.name)}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {getBooksByCategory(cat.id, books).length} {t("booksInCategory")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
