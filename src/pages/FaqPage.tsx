import { Accordion } from "../components/ui/Accordion";
import { Seo } from "../components/Seo";
import { useLanguage } from "../i18n/LanguageContext";

export function FaqPage() {
  const { t } = useLanguage();
  const faq = [
    { id: "1", question: t("faq1q"), answer: t("faq1a") },
    { id: "2", question: t("faq2q"), answer: t("faq2a") },
    { id: "3", question: t("faq3q"), answer: t("faq3a") },
    { id: "4", question: t("faq4q"), answer: t("faq4a") },
    { id: "5", question: t("faq5q"), answer: t("faq5a") },
  ];

  return (
    <>
      <Seo title={t("navFaq")} description={t("seoFaq")} />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-serif text-4xl">{t("faqTitle")}</h1>
        <Accordion items={faq} />
      </div>
    </>
  );
}
