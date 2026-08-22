import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PaymentCards } from "../components/payment/PaymentCards";
import { Seo } from "../components/Seo";
import { Button } from "../components/ui/Button";
import { Field, Select, TextArea, TextInput } from "../components/ui/Field";
import { getBookBySlug, getCategoryName } from "../data/books";
import { type PaymentMethod } from "../data/site";
import { useLanguage } from "../i18n/LanguageContext";
import { BD_MOBILE_RE, formatBdt, GMAIL_RE } from "../lib/formatMoney";
import type { OrderSuccessState } from "./OrderSuccessPage";
import { useContent } from "../context/ContentContext";

const startedAt = Date.now();

export function CheckoutPage() {
  const { slug } = useParams();
  const { t, loc } = useLanguage();
  const navigate = useNavigate();
  const { books, categories } = useContent();
  const book = slug ? getBookBySlug(slug, books) : undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [amount, setAmount] = useState(book ? String(book.priceBdt) : "");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const steps = useMemo(
    () =>
      [t("ins1"), t("ins2"), t("ins3"), t("ins4"), t("ins5"), t("ins6"), t("ins7"), t("ins8")],
    [t],
  );

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Seo title={t("bookNotFound")} description={t("bookNotFound")} />
        <h1 className="font-serif text-3xl">{t("bookNotFound")}</h1>
        <Link to="/books" className="mt-6 inline-block text-amber-800">
          {t("backToBooks")}
        </Link>
      </div>
    );
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t("required");
    if (!email.trim()) next.email = t("required");
    else if (!GMAIL_RE.test(email.trim())) next.email = t("invalidEmail");
    if (!method) next.method = t("required");
    if (!sender.trim()) next.sender = t("required");
    else if (!BD_MOBILE_RE.test(sender.trim())) next.sender = t("invalidMobile");
    if (!trx.trim() || trx.trim().length < 4) next.trx = t("invalidTrx");
    const pay = Number(amount);
    if (!amount.trim()) next.amount = t("required");
    else if (!book || pay !== book.priceBdt) next.amount = t("amountMismatch");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!validate() || !book) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          gmail: email.trim(),
          bookSlug: book.slug,
          paymentMethod: method,
          senderMobile: sender.trim(),
          transactionId: trx.trim(),
          paymentAmount: Number(amount),
          customerMessage: message.trim() || undefined,
          company: honeypot,
          formStartedAt: startedAt,
        }),
      });
      const data = (await res.json().catch(() => null)) as { orderId?: string; error?: string; whatsappUrl?: string } | null;
      if (data?.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
        setFormError("Email delivery failed. WhatsApp was opened with your order details; tap Send to submit it.");
        setSubmitting(false);
        return;
      }
      if (!res.ok || !data?.orderId) {
        setFormError(data?.error || t("submitError"));
        setSubmitting(false);
        return;
      }
      const state: OrderSuccessState = {
        orderId: data.orderId,
        bookTitle: loc(book.title),
        paymentMethod: method === "rocket" ? "Rocket" : "bKash",
        paymentAmount: book.priceBdt,
        gmail: email.trim(),
      };
      navigate("/order-success", { state, replace: true });
    } catch {
      setFormError(t("submitError"));
      setSubmitting(false);
    }
  }

  return (
    <>
      <Seo title={t("paymentTitle")} description={t("seoCheckout")} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-serif text-4xl">{t("paymentTitle")}</h1>
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          {t("manualNotice")}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <aside className="lg:col-span-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-400">
                {t("selectedBook")}
              </p>
              <img
                src={book.coverImage}
                alt={loc(book.title)}
                className="mt-4 w-full rounded-xl object-cover"
              />
              <h2 className="mt-4 font-serif text-2xl">{loc(book.title)}</h2>
              <p className="mt-1 text-sm text-stone-500">{loc(getCategoryName(book.category, categories))}</p>
              <p className="mt-3 text-2xl font-semibold">{formatBdt(book.priceBdt)}</p>
            </div>
          </aside>

          <div className="space-y-8 lg:col-span-3">
            <section>
              <h2 className="mb-4 font-serif text-2xl">{t("paymentMethods")}</h2>
              <PaymentCards />
            </section>

            <section>
              <h2 className="mb-4 font-serif text-2xl">{t("instructions")}</h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6" noValidate>
              <h2 className="font-serif text-2xl">{t("formTitle")}</h2>

              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <fieldset className="space-y-4">
                <legend className="font-medium">{t("customerInfo")}</legend>
                <Field label={t("fullName")} htmlFor="fullName" error={errors.name}>
                  <TextInput
                    id="fullName"
                    autoComplete="name"
                    value={name}
                    aria-invalid={Boolean(errors.name)}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label={t("gmail")} htmlFor="gmail" error={errors.email}>
                  <TextInput
                    id="gmail"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    aria-invalid={Boolean(errors.email)}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="font-medium">{t("bookInfo")}</legend>
                <p className="text-sm">
                  {t("selectedBook")}: <strong>{loc(book.title)}</strong>
                </p>
                <p className="text-sm">
                  {t("bookPrice")}: <strong>{formatBdt(book.priceBdt)}</strong>
                </p>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="font-medium">{t("paymentInfo")}</legend>
                <Field label={t("paymentMethod")} htmlFor="method" error={errors.method}>
                  <Select
                    id="method"
                    value={method}
                    aria-invalid={Boolean(errors.method)}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod | "")}
                  >
                    <option value="">—</option>
                    <option value="bkash">bKash</option>
                    <option value="rocket">Rocket</option>
                  </Select>
                </Field>
                <Field label={t("senderMobile")} htmlFor="sender" error={errors.sender}>
                  <TextInput
                    id="sender"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    value={sender}
                    aria-invalid={Boolean(errors.sender)}
                    onChange={(e) => setSender(e.target.value)}
                  />
                </Field>
                <Field label={t("trxId")} htmlFor="trx" error={errors.trx}>
                  <TextInput
                    id="trx"
                    value={trx}
                    aria-invalid={Boolean(errors.trx)}
                    onChange={(e) => setTrx(e.target.value)}
                  />
                </Field>
                <Field label={t("payAmount")} htmlFor="amount" error={errors.amount}>
                  <TextInput
                    id="amount"
                    inputMode="numeric"
                    value={amount}
                    aria-invalid={Boolean(errors.amount)}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
              </fieldset>

              <Field label={t("message")} htmlFor="note">
                <TextArea id="note" value={message} onChange={(e) => setMessage(e.target.value)} />
              </Field>

              {formError ? <p className="text-sm text-red-800">{formError}</p> : null}

              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? t("submitting") : t("submitOrder")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
