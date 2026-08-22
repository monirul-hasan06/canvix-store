import { useState } from "react";
import { type PaymentMethod } from "../../data/site";
import { useLanguage } from "../../i18n/LanguageContext";
import { copyText } from "../../lib/formatMoney";
import { useContent } from "../../context/ContentContext";

const methods: { id: PaymentMethod; label: string }[] = [
  { id: "bkash", label: "bKash" },
  { id: "rocket", label: "Rocket" },
];

export function PaymentCards() {
  const { t } = useLanguage();
  const { paymentNumbers } = useContent();
  const [copied, setCopied] = useState<PaymentMethod | null>(null);

  async function onCopy(id: PaymentMethod) {
    await copyText(paymentNumbers[id]);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {methods.map((method) => (
        <li
          key={method.id}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            {method.label}
          </p>
          <p className="mt-1 text-sm text-stone-500">{t("personal")}</p>
          <p className="mt-3 font-mono text-2xl tracking-wide text-stone-900">
            {paymentNumbers[method.id]}
          </p>
          <button
            type="button"
            className="mt-4 w-full rounded-full border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
            onClick={() => onCopy(method.id)}
          >
            {copied === method.id ? t("copied") : t("copy")}
          </button>
        </li>
      ))}
    </ul>
  );
}
