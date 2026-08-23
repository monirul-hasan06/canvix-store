import { Link } from "react-router-dom";
import { discountPercent } from "../../data/books";
import { getCategoryName } from "../../data/books";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatBdt } from "../../lib/formatMoney";
import type { Book } from "../../types/book";
import { ButtonLink } from "../ui/Button";
import { useContent } from "../../context/ContentContext";

export function BookCard({ book }: { book: Book }) {
  const { t, loc } = useLanguage();
  const { categories } = useContent();
  const discount = discountPercent(book);

  return (
    <article className="interactive-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <Link to={`/books/${book.slug}`} className="relative block overflow-hidden bg-stone-100">
        <img
          src={book.coverImage}
          alt={loc(book.title)}
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {book.newArrival ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-800 px-2.5 py-1 text-xs font-medium text-amber-50">
            {t("newBadge")}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-amber-800">
          {loc(getCategoryName(book.category, categories))}
        </p>
        <h3 className="font-serif text-xl leading-snug text-stone-900">
          <Link to={`/books/${book.slug}`} className="hover:text-amber-900">
            {loc(book.title)}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-stone-600">
          {loc(book.shortDescription)}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-lg font-semibold text-stone-900">{formatBdt(book.priceBdt)}</p>
            {book.originalPriceBdt && discount ? (
              <p className="text-xs text-stone-500">
                <span className="line-through">{formatBdt(book.originalPriceBdt)}</span>
                {" · "}
                {discount}%
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink to={`/books/${book.slug}`} variant="secondary" className="flex-1">
            {t("viewDetails")}
          </ButtonLink>
          <ButtonLink to={`/checkout/${book.slug}`} className="flex-1">
            {t("buyNow")}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
