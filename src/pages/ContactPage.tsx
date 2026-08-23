import { useState, type FormEvent } from "react";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/Button";
import { Field, TextArea, TextInput } from "../components/ui/Field";
import { useLanguage } from "../i18n/LanguageContext";

export function ContactPage() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send your message.");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Seo title={t("navContact")} description={t("seoContact")} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div>
          <h1 className="font-serif text-4xl">{t("navContact")}</h1>
          <p className="mt-3 max-w-md text-stone-600">{t("contactIntro")}</p>
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
            {error ? <p className="text-sm text-red-800" role="alert">{error}</p> : null}
            <Button type="submit" disabled={sending}>{sending ? "Sending..." : t("sendMessage")}</Button>
          </form>
        )}
      </div>
    </>
  );
}
