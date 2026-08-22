import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Field, TextArea, TextInput } from "../components/ui/Field";
import { Seo } from "../components/Seo";
import type { Book } from "../types/book";

type Content = {
  version: number;
  updatedAt: string;
  books: Book[];
  paymentNumbers: { bkash: string; rocket: string };
};

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<Content | null>(null);
  const [booksJson, setBooksJson] = useState("");
  const [bkash, setBkash] = useState("");
  const [rocket, setRocket] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request("/api/admin/session")
      .then((data: { authenticated: boolean }) => {
        setAuthenticated(data.authenticated);
        if (data.authenticated) return request("/api/content");
        return null;
      })
      .then((data: Content | null) => {
        if (data) applyContent(data);
      })
      .catch((reason: Error) => {
        setAuthenticated(false);
        setError(`Admin server unavailable: ${reason.message}`);
      });
  }, []);

  function applyContent(data: Content) {
    setContent(data);
    setBooksJson(JSON.stringify(data.books, null, 2));
    setBkash(data.paymentNumbers.bkash);
    setRocket(data.paymentNumbers.rocket);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const data = (await request("/api/content")) as Content;
      applyContent(data);
      setAuthenticated(true);
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!content) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const books = JSON.parse(booksJson) as Book[];
      const saved = (await request("/api/admin/content", {
        method: "PUT",
        body: JSON.stringify({ version: content.version, books, paymentNumbers: { bkash, rocket } }),
      })) as Content;
      applyContent(saved);
      setNotice("Saved successfully.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await request("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setContent(null);
  }

  if (authenticated === null) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center">Loading admin panel...</div>;
  }

  if (!authenticated) {
    return (
      <>
        <Seo title="Admin login" description="Canvix Store administrator login." />
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Canvix Store</p>
          <h1 className="mt-3 font-serif text-4xl">Admin login</h1>
          <p className="mt-3 text-sm text-stone-600">Sign in to manage catalog and payment settings.</p>
          <form onSubmit={login} className="mt-8 space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
            <Field label="Admin email" htmlFor="admin-email">
              <TextInput id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field label="Password" htmlFor="admin-password">
              <TextInput id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
            {error ? <p className="text-sm text-red-800" role="alert">{error}</p> : null}
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in..." : "Sign in"}</Button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Admin panel" description="Manage Canvix Store catalog and payment settings." />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Control center</p>
            <h1 className="mt-2 font-serif text-4xl">Admin panel</h1>
          </div>
          <div className="flex gap-3 text-sm">
            <Link to="/" className="rounded-full border border-stone-300 px-4 py-2.5">View store</Link>
            <Button type="button" variant="secondary" onClick={logout}>Sign out</Button>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-stone-600">Changes are stored on the server. Edit the catalog JSON to add, remove, or update books without exposing PDF files.</p>
        <form onSubmit={save} className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Payment settings</h2>
            <Field label="bKash personal number" htmlFor="admin-bkash">
              <TextInput id="admin-bkash" inputMode="numeric" value={bkash} onChange={(event) => setBkash(event.target.value)} />
            </Field>
            <Field label="Rocket personal number" htmlFor="admin-rocket">
              <TextInput id="admin-rocket" inputMode="numeric" value={rocket} onChange={(event) => setRocket(event.target.value)} />
            </Field>
            <p className="text-xs text-stone-500">Last saved: {content ? new Date(content.updatedAt).toLocaleString() : "-"}</p>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl">Book catalog</h2>
                <p className="mt-1 text-sm text-stone-500">Use the existing Book shape. Cover paths must start with /covers/ or /assets/.</p>
              </div>
              <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">{content?.books.length ?? 0} books</span>
            </div>
            <TextArea aria-label="Book catalog JSON" className="mt-5 min-h-[32rem] font-mono text-xs" value={booksJson} onChange={(event) => setBooksJson(event.target.value)} />
          </section>
          <div className="lg:col-span-2">
            {error ? <p className="mb-3 text-sm text-red-800" role="alert">{error}</p> : null}
            {notice ? <p className="mb-3 text-sm text-emerald-800" role="status">{notice}</p> : null}
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
