import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { copyText } from "../../lib/formatMoney";
import { useContent } from "../../context/ContentContext";

export function PaymentCards() {
  const { t } = useLanguage();
  const { paymentMethods } = useContent();
  const [copied, setCopied] = useState<string | null>(null);

  async function onCopy(id: string, number: string) {
    try {
      await copyText(number);
      setCopied(id);
    } catch {
      setCopied(null);
    }
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {paymentMethods.filter((method) => method.enabled).map((method) => (
        <li
          key={method.id}
          className="interactive-lift rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
            {method.name}
          </p>
          <p className="mt-1 text-sm text-stone-500">{t("personal")}</p>
          <p className="mt-3 font-mono text-2xl tracking-wide text-stone-900">
            {method.number}
          </p>
          <button
            type="button"
            className="mt-4 w-full rounded-full border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
            onClick={() => onCopy(method.id, method.number)}
          >
            {copied === method.id ? t("copied") : t("copy")}
          </button>
        </li>
      ))}
    </ul>
  );
}
