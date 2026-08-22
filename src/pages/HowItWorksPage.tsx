import { HowItWorksList } from "../components/home/HowItWorksList";
import { Seo } from "../components/Seo";
import { useLanguage } from "../i18n/LanguageContext";

export function HowItWorksPage() {
  const { t } = useLanguage();
  return (
    <>
      <Seo title={t("navHow")} description={t("seoHow")} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-serif text-4xl">{t("howTitle")}</h1>
        <HowItWorksList />
        <p className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          {t("manualNotice")}
        </p>
      </div>
    </>
  );
}
