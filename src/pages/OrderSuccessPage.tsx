import { Link, useLocation } from "react-router-dom";
import { Seo } from "../components/Seo";
import { useLanguage } from "../i18n/LanguageContext";
import { formatBdt } from "../lib/formatMoney";

export type OrderSuccessState = {
  orderId: string;
  bookTitle: string;
  paymentMethod: string;
  paymentAmount: number;
  gmail: string;
};

export function OrderSuccessPage() {
  const { t } = useLanguage();
  const { state } = useLocation();
  const order = state as OrderSuccessState | null;

  if (!order?.orderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Seo title={t("notFound")} description={t("notFound")} />
        <h1 className="font-serif text-3xl">{t("notFound")}</h1>
        <Link to="/books" className="mt-6 inline-block text-amber-800">
          {t("backToBooks")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <Seo title={t("successTitle")} description={t("seoSuccess")} />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
            {t("successTitle")}
          </p>
          <h1 className="mt-3 font-serif text-4xl text-stone-900">{t("successTitle")}</h1>
          <p className="mt-4 leading-relaxed text-stone-700">{t("successBody")}</p>
          <dl className="mt-8 grid gap-4 border-t border-emerald-200 pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">{t("orderId")}</dt>
              <dd className="mt-1 font-mono font-semibold text-stone-900">{order.orderId}</dd>
            </div>
            <div>
              <dt className="text-stone-500">{t("selectedBook")}</dt>
              <dd className="mt-1 font-medium text-stone-900">{order.bookTitle}</dd>
            </div>
            <div>
              <dt className="text-stone-500">{t("paymentMethod")}</dt>
              <dd className="mt-1 font-medium text-stone-900">{order.paymentMethod}</dd>
            </div>
            <div>
              <dt className="text-stone-500">{t("payAmount")}</dt>
              <dd className="mt-1 font-medium text-stone-900">{formatBdt(order.paymentAmount)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-500">{t("gmail")}</dt>
              <dd className="mt-1 font-medium text-stone-900">{order.gmail}</dd>
            </div>
          </dl>
        </div>
        <Link to="/books" className="mt-8 inline-block text-sm font-medium text-amber-800">
          {t("backToBooks")}
        </Link>
      </div>
    </>
  );
}
