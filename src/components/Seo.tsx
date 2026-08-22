import { Helmet } from "react-helmet-async";
import { STORE_NAME } from "../data/site";
import { useLanguage } from "../i18n/LanguageContext";

type SeoProps = {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>;
};

export function Seo({ title, description, jsonLd }: SeoProps) {
  const { lang } = useLanguage();
  const fullTitle =
    title === STORE_NAME
      ? `${STORE_NAME}`
      : `${title} | ${STORE_NAME}`;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={STORE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={lang === "bn" ? "bn_BD" : "en_US"} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
