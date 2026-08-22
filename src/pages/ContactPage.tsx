import { useState, type FormEvent } from "react";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/Button";
import { Field, TextArea, TextInput } from "../components/ui/Field";
import { OWNER_EMAIL } from "../data/site";
import { useLanguage } from "../i18n/LanguageContext";

export function ContactPage() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <Seo title={t("navContact")} description={t("seoContact")} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div>
          <h1 className="font-serif text-4xl">{t("navContact")}</h1>
          <p className="mt-3 max-w-md text-stone-600">{t("contactIntro")}</p>
          <a className="mt-6 inline-block text-amber-800" href={`mailto:${OWNER_EMAIL}`}>
            {OWNER_EMAIL}
          </a>
        </div>
        {sent ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8">
            <h2 className="font-serif text-2xl">{t("messageSent")}</h2>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
            <Field label={t("fullName")} htmlFor="name">
              <TextInput id="name" name="name" required autoComplete="name" />
            </Field>
            <Field label={t("gmail")} htmlFor="email">
              <TextInput id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field label={t("yourMessage")} htmlFor="message">
              <TextArea id="message" name="message" required />
            </Field>
            <Button type="submit">{t("sendMessage")}</Button>
          </form>
        )}
      </div>
    </>
  );
}
