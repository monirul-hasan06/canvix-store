import { Link, useParams } from "react-router-dom";
import { BookGrid } from "../components/books/BookGrid";
import { Seo } from "../components/Seo";
import { ButtonLink } from "../components/ui/Button";
import {
  discountPercent,
  getBookBySlug,
  getCategoryName,
  getRelatedBooks,
} from "../data/books";
import { STORE_NAME } from "../data/site";
import { useLanguage } from "../i18n/LanguageContext";
import { formatBdt } from "../lib/formatMoney";
import { useContent } from "../context/ContentContext";

export function BookDetailsPage() {
  const { slug } = useParams();
  const { t, loc } = useLanguage();
  const { books, categories } = useContent();
  const book = slug ? getBookBySlug(slug, books) : undefined;

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Seo title={t("bookNotFound")} description={t("bookNotFound")} />
        <h1 className="font-serif text-3xl">{t("bookNotFound")}</h1>
        <Link to="/books" className="mt-6 inline-block text-amber-800">
          {t("backToBooks")}
        </Link>
      </div>
    );
  }

  const discount = discountPercent(book);
  const related = getRelatedBooks(book, 3, books);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: loc(book.title),
    description: loc(book.shortDescription),
    image: book.coverImage,
    brand: { "@type": "Brand", name: STORE_NAME },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: book.priceBdt,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <Seo title={loc(book.title)} description={loc(book.shortDescription)} jsonLd={jsonLd} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-100">
          <img src={book.coverImage} alt={loc(book.title)} className="w-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            {loc(getCategoryName(book.category, categories))}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">{loc(book.title)}</h1>
          <p className="mt-2 text-sm text-stone-500">
            {t("author")}: {loc(book.author)}
          </p>
          <div className="mt-6">
            <p className="font-serif text-4xl">{formatBdt(book.priceBdt)}</p>
            {book.originalPriceBdt && discount ? (
              <p className="mt-1 text-sm text-stone-500">
                <span className="line-through">{formatBdt(book.originalPriceBdt)}</span>
                {" · "}
                {discount}%
              </p>
            ) : null}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm text-stone-600">
            <div>
              <dt className="text-stone-400">{t("pages")}</dt>
              <dd>{book.pages}</dd>
            </div>
            <div>
              <dt className="text-stone-400">{t("fileSize")}</dt>
              <dd>{book.fileSize}</dd>
            </div>
            <div>
              <dt className="text-stone-400">{t("language")}</dt>
              <dd>{loc(book.language)}</dd>
            </div>
            <div>
              <dt className="text-stone-400">{t("format")}</dt>
              <dd>{book.format}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-stone-600">
            {loc(book.longDescription)}
          </p>
          <h2 className="mt-8 font-serif text-2xl">{t("youReceive")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{loc(book.receives)}</p>
          <div className="mt-8">
            <ButtonLink to={`/checkout/${book.slug}`} className="w-full sm:w-auto">
              {t("buyNow")}
            </ButtonLink>
          </div>
        </div>
      </div>
      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="mb-6 font-serif text-3xl">{t("related")}</h2>
          <BookGrid books={related} />
        </section>
      ) : null}
    </>
  );
}
