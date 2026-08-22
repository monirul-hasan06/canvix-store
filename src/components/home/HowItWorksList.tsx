import { useLanguage } from "../../i18n/LanguageContext";

const steps = [
  ["how1t", "how1b"],
  ["how2t", "how2b"],
  ["how3t", "how3b"],
  ["how4t", "how4b"],
  ["how5t", "how5b"],
] as const;

export function HowItWorksList() {
  const { t } = useLanguage();

  return (
    <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
      {steps.map(([title, body], i) => (
        <li
          key={title}
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-800">
            0{i + 1}
          </p>
          <h3 className="mt-2 font-serif text-xl text-stone-900">{t(title)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{t(body)}</p>
        </li>
      ))}
    </ol>
  );
}
