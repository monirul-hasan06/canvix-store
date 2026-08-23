// import { Seo } from "../components/Seo";
import { Seo } from "../components/Seo";
import { useLanguage } from "../i18n/LanguageContext";

export function ContactPage() {
  const { t } = useLanguage();

  return (
    <>
      <Seo title={t("navContact")} description={t("seoContact")} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl">
            {t("navContact")}
          </h1>

          <p className="mt-3 text-stone-600">
            {t("contactIntro")}
          </p>

          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8">
            <p className="text-sm text-stone-500">
              Get in touch with us
            </p>

            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=dev.get.in.touch@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-lg font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-900"
            >
              dev.get.in.touch@gmail.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}