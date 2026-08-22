import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { useLanguage } from "../i18n/LanguageContext";

export function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <>
      <Seo title={t("notFound")} description={t("notFound")} />
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-serif text-4xl">{t("notFound")}</h1>
        <Link to="/" className="mt-6 inline-block text-amber-800">
          {t("goHome")}
        </Link>
      </div>
    </>
  );
}
