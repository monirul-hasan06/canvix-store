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
  categories: { id: string; name: { bn: string; en: string } }[];
  paymentNumbers: { bkash: string; rocket: string };
  showCategories: boolean;
};

type NewBook = Record<string, string>;

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = response.status === 204 ? null : await response.json().catch(() => {
    throw new Error("Admin server returned an invalid response. Make sure the API server is running.");
  });
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
  const [coverSlug, setCoverSlug] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [categoriesJson, setCategoriesJson] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [newBook, setNewBook] = useState<NewBook>({ titleBn: "", titleEn: "", authorBn: "", authorEn: "", shortBn: "", shortEn: "", longBn: "", longEn: "", receivesBn: "", receivesEn: "", coverImage: "/covers/", price: "", originalPrice: "", category: "other", tagsBn: "", tagsEn: "", pages: "", fileSize: "", languageBn: "ইংরেজি", languageEn: "English" });
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
        if (data) {
          applyContent(data);
        }
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
    setCategoriesJson(JSON.stringify(data.categories, null, 2));
    setShowCategories(data.showCategories);
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
      const categories = JSON.parse(categoriesJson) as Content["categories"];
      const saved = (await request("/api/admin/content", {
        method: "PUT",
        body: JSON.stringify({ version: content.version, books, categories, paymentNumbers: { bkash, rocket }, showCategories }),
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


  async function uploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !coverSlug) return;
    setUploadingCover(true);
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read cover."));
        reader.readAsDataURL(file);
      });
      const result = (await request("/api/admin/covers", { method: "POST", body: JSON.stringify({ dataUrl }) })) as { coverPath: string };
      const catalog = JSON.parse(booksJson) as Book[];
      setBooksJson(JSON.stringify(catalog.map((book) => book.slug === coverSlug ? { ...book, coverImage: result.coverPath } : book), null, 2));
      setNotice("Cover uploaded. Save changes to publish it.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload cover.");
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  }

  function addBook(event: FormEvent) {
    event.preventDefault();
    if (!content || !newBook.titleEn.trim() || !newBook.price || !newBook.category) {
      setError("Title, price, and category are required.");
      return;
    }
    const slug = newBook.titleEn.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const catalog = JSON.parse(booksJson) as Book[];
    if (catalog.some((book) => book.slug === slug)) {
      setError("A book with this title already exists.");
      return;
    }
    const tagsEn = newBook.tagsEn.split(",").map((tag) => tag.trim()).filter(Boolean);
    const tagsBn = newBook.tagsBn.split(",").map((tag) => tag.trim());
    const book: Book = {
      id: `book-${Date.now()}`, slug,
      title: { bn: newBook.titleBn.trim() || newBook.titleEn.trim(), en: newBook.titleEn.trim() },
      author: { bn: newBook.authorBn.trim() || newBook.authorEn.trim() || "Canvix Press", en: newBook.authorEn.trim() || "Canvix Press" },
      coverImage: newBook.coverImage.trim(),
      shortDescription: { bn: newBook.shortBn.trim() || newBook.shortEn.trim(), en: newBook.shortEn.trim() },
      longDescription: { bn: newBook.longBn.trim() || newBook.longEn.trim(), en: newBook.longEn.trim() },
      receives: { bn: newBook.receivesBn.trim() || newBook.receivesEn.trim(), en: newBook.receivesEn.trim() },
      priceBdt: Number(newBook.price),
      ...(newBook.originalPrice ? { originalPriceBdt: Number(newBook.originalPrice) } : {}),
      category: newBook.category, tags: tagsEn.map((tag, index) => ({ bn: tagsBn[index] || tag, en: tag })),
      pages: Number(newBook.pages) || 0, fileSize: newBook.fileSize.trim() || "-",
      language: { bn: newBook.languageBn.trim() || "ইংরেজি", en: newBook.languageEn.trim() || "English" },
      format: "PDF", featured: false, newArrival: true,
    };
    setBooksJson(JSON.stringify([...catalog, book], null, 2));
    setNotice("Book added to the draft. Click Save changes to publish it.");
  }

  function updateNewBook(key: string, value: string) {
    setNewBook((current) => ({ ...current, [key]: value }));
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
        <form onSubmit={addBook} className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
          <h2 className="font-serif text-2xl">Add new book</h2>
          <p className="mt-1 text-sm text-stone-600">Complete the book details, then click Add book. It will be published when you save changes below.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[["titleEn", "Title (English)"], ["titleBn", "Title (Bangla)"], ["authorEn", "Author (English)"], ["authorBn", "Author (Bangla)"], ["price", "Price (BDT)"], ["originalPrice", "Original price (optional)"], ["pages", "Pages"], ["fileSize", "File size"], ["languageEn", "Language (English)"], ["languageBn", "Language (Bangla)"], ["coverImage", "Cover path"]].map(([key, label]) => <Field key={key} label={label} htmlFor={`new-${key}`}><TextInput id={`new-${key}`} type={key === "price" || key === "originalPrice" || key === "pages" ? "number" : "text"} value={newBook[key]} onChange={(event) => updateNewBook(key, event.target.value)} required={key === "titleEn" || key === "price"} /></Field>)}
            <Field label="Category" htmlFor="new-category"><select id="new-category" className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={newBook.category} onChange={(event) => updateNewBook("category", event.target.value)}>{content?.categories.map((category) => <option key={category.id} value={category.id}>{category.name.en}</option>)}</select></Field>
            <Field label="Tags (English, comma separated)" htmlFor="new-tags-en"><TextInput id="new-tags-en" value={newBook.tagsEn} onChange={(event) => updateNewBook("tagsEn", event.target.value)} /></Field>
            <Field label="Tags (Bangla, comma separated)" htmlFor="new-tags-bn"><TextInput id="new-tags-bn" value={newBook.tagsBn} onChange={(event) => updateNewBook("tagsBn", event.target.value)} /></Field>
            <Field label="Short description (English)" htmlFor="new-short-en"><TextArea id="new-short-en" value={newBook.shortEn} onChange={(event) => updateNewBook("shortEn", event.target.value)} required /></Field>
            <Field label="Short description (Bangla)" htmlFor="new-short-bn"><TextArea id="new-short-bn" value={newBook.shortBn} onChange={(event) => updateNewBook("shortBn", event.target.value)} /></Field>
            <Field label="Full description (English)" htmlFor="new-long-en"><TextArea id="new-long-en" value={newBook.longEn} onChange={(event) => updateNewBook("longEn", event.target.value)} required /></Field>
            <Field label="Full description (Bangla)" htmlFor="new-long-bn"><TextArea id="new-long-bn" value={newBook.longBn} onChange={(event) => updateNewBook("longBn", event.target.value)} /></Field>
            <Field label="What customer receives (English)" htmlFor="new-receives-en"><TextArea id="new-receives-en" value={newBook.receivesEn} onChange={(event) => updateNewBook("receivesEn", event.target.value)} required /></Field>
            <Field label="What customer receives (Bangla)" htmlFor="new-receives-bn"><TextArea id="new-receives-bn" value={newBook.receivesBn} onChange={(event) => updateNewBook("receivesBn", event.target.value)} /></Field>
          </div>
          <Button type="submit" className="mt-5">Add book</Button>
        </form>
        <form onSubmit={save} className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Payment settings</h2>
            <Field label="bKash personal number" htmlFor="admin-bkash">
              <TextInput id="admin-bkash" inputMode="numeric" value={bkash} onChange={(event) => setBkash(event.target.value)} />
            </Field>
            <Field label="Rocket personal number" htmlFor="admin-rocket">
              <TextInput id="admin-rocket" inputMode="numeric" value={rocket} onChange={(event) => setRocket(event.target.value)} />
            </Field>
            <label className="flex items-center gap-3 text-sm text-stone-700"><input type="checkbox" checked={showCategories} onChange={(event) => setShowCategories(event.target.checked)} /> Show category list on homepage</label>
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
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Book to update cover" htmlFor="cover-book">
                <select id="cover-book" className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={coverSlug} onChange={(event) => setCoverSlug(event.target.value)}>
                  <option value="">Select a book</option>
                  {content?.books.map((book) => <option key={book.slug} value={book.slug}>{book.title.en}</option>)}
                </select>
              </Field>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium hover:bg-stone-50">
                {uploadingCover ? "Uploading..." : "Upload cover"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={!coverSlug || uploadingCover} onChange={uploadCover} />
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Categories</h2>
            <p className="mt-1 text-sm text-stone-500">Add, edit, or remove categories using localized names.</p>
            <TextArea aria-label="Categories JSON" className="mt-5 min-h-64 font-mono text-xs" value={categoriesJson} onChange={(event) => setCategoriesJson(event.target.value)} />
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
