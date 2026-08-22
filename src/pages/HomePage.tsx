import { Link } from "react-router-dom";
import { Accordion } from "../components/ui/Accordion";
import { BookGrid } from "../components/books/BookGrid";
import { HowItWorksList } from "../components/home/HowItWorksList";
import { Seo } from "../components/Seo";
import { ButtonLink } from "../components/ui/Button";
import { categories, getBooksByCategory, getFeaturedBooks } from "../data/books";
import { STORE_NAME } from "../data/site";
import { useLanguage } from "../i18n/LanguageContext";
import { useContent } from "../context/ContentContext";

export function HomePage() {
  const { t, loc } = useLanguage();
  const { books } = useContent();
  const featured = getFeaturedBooks(books);

  const faq = [
    { id: "1", question: t("faq1q"), answer: t("faq1a") },
    { id: "2", question: t("faq2q"), answer: t("faq2a") },
    { id: "3", question: t("faq3q"), answer: t("faq3a") },
    { id: "4", question: t("faq4q"), answer: t("faq4a") },
    { id: "5", question: t("faq5q"), answer: t("faq5a") },
  ];

  return (
    <>
      <Seo title={STORE_NAME} description={t("seoHome")} />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
            {t("heroKicker")}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            {t("heroBody")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/books">{t("browseBooks")}</ButtonLink>
            <ButtonLink to="/books" variant="secondary">
              {t("exploreCollection")}
            </ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-[2rem] bg-amber-800/10" aria-hidden />
          <img
            src="/covers/how-to-be-an-alpha-male.svg"
            alt={loc(books[0].title)}
            className="relative w-full rounded-3xl border border-stone-200 shadow-lg"
          />
        </div>
      </section>

      <section className="border-t border-stone-200/80 bg-[#efe8dc]/50 py-14" id="featured">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-serif text-3xl">{t("featured")}</h2>
          <div className="mt-8">
            <BookGrid books={featured.length ? featured : books} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" id="all-books">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl">{t("allBooks")}</h2>
          <Link to="/books" className="text-sm font-medium text-amber-800">
            {t("viewAll")}
          </Link>
        </div>
        <BookGrid books={books} />
      </section>

      <section className="border-t border-stone-200/80 bg-[#efe8dc]/40 py-14" id="categories">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-serif text-3xl">{t("categories")}</h2>
          <p className="mt-2 max-w-2xl text-stone-600">{t("categoriesIntro")}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const count = getBooksByCategory(cat.id, books).length;
              return (
                <li key={cat.id}>
                  <Link
                    to={`/categories/${cat.id}`}
                    className="block rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md"
                  >
                    <p className="font-serif text-xl">{loc(cat.name)}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {count} {t("booksInCategory")}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" id="how-it-works">
        <h2 className="mb-8 font-serif text-3xl">{t("howTitle")}</h2>
        <HowItWorksList />
      </section>

      <section className="border-t border-stone-200/80 py-14" id="faq">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 font-serif text-3xl">{t("faqTitle")}</h2>
          <Accordion items={faq} />
        </div>
      </section>
    </>
  );
}
