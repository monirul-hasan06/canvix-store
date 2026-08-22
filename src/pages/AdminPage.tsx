import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Field, TextArea, TextInput } from "../components/ui/Field";
import { Seo } from "../components/Seo";
import { DEFAULT_PAYMENT_METHODS, type PaymentOption } from "../data/site";
import { defaultSiteCopy, type DictKey, type SiteCopy } from "../i18n/dictionary";
import type { Book } from "../types/book";

type Content = {
  version: number;
  updatedAt: string;
  books: Book[];
  categories: { id: string; name: { bn: string; en: string }; visible?: boolean }[];
  paymentMethods: PaymentOption[];
  showCategories: boolean;
  siteCopy: SiteCopy;
};

type NewBook = Record<string, string>;

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = response.status === 204 ? null : await response.json().catch(() => ({ error: `Request failed with status ${response.status}.` }));
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<Content | null>(null);
  const [booksJson, setBooksJson] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentOption[]>(DEFAULT_PAYMENT_METHODS);
  const [newPaymentId, setNewPaymentId] = useState("");
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentNumber, setNewPaymentNumber] = useState("");
  const [coverSlug, setCoverSlug] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [categoriesJson, setCategoriesJson] = useState("");
  const [showCategories, setShowCategories] = useState(true);
  const [newBook, setNewBook] = useState<NewBook>({ titleBn: "", titleEn: "", authorBn: "", authorEn: "", shortBn: "", shortEn: "", longBn: "", longEn: "", receivesBn: "", receivesEn: "", coverImage: "/covers/", price: "", originalPrice: "", category: "other", tagsBn: "", tagsEn: "", pages: "", fileSize: "", languageBn: "ইংরেজি", languageEn: "English" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [catalogStatus, setCatalogStatus] = useState("all");
  const [catalogSort, setCatalogSort] = useState("title");
  const [draftDirty, setDraftDirty] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCategoryEn, setNewCategoryEn] = useState("");
  const [newCategoryBn, setNewCategoryBn] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [siteCopy, setSiteCopy] = useState<Record<DictKey, { bn: string; en: string }>>(defaultSiteCopy);
  const [copyQuery, setCopyQuery] = useState("");

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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!draftDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftDirty]);

  function applyContent(data: Content) {
    setContent(data);
    setBooksJson(JSON.stringify(data.books, null, 2));
    setPaymentMethods(data.paymentMethods?.length ? data.paymentMethods : DEFAULT_PAYMENT_METHODS);
    setCategoriesJson(JSON.stringify(data.categories, null, 2));
    setShowCategories(data.showCategories);
    setSiteCopy({ ...defaultSiteCopy, ...(data.siteCopy || {}) });
    setDraftDirty(false);
  }

  const draftBooks = useMemo(() => {
    try {
      const parsed = JSON.parse(booksJson);
      return Array.isArray(parsed) ? parsed as Book[] : [];
    } catch {
      return [];
    }
  }, [booksJson]);

  const draftCategories = useMemo(() => {
    try {
      const parsed = JSON.parse(categoriesJson);
      return Array.isArray(parsed) ? parsed as Content["categories"] : [];
    } catch {
      return [];
    }
  }, [categoriesJson]);

  const filteredBooks = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    const result = draftBooks.filter((book) => {
      const values = [book.title?.en, book.title?.bn, book.author?.en, book.author?.bn, book.slug];
      const matchesQuery = !query || values.filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      const matchesCategory = catalogCategory === "all" || book.category === catalogCategory;
      const matchesStatus = catalogStatus === "all" || (catalogStatus === "featured" && book.featured) || (catalogStatus === "new" && book.newArrival);
      return matchesQuery && matchesCategory && matchesStatus;
    });
    return [...result].sort((left, right) => catalogSort === "price" ? left.priceBdt - right.priceBdt : left.title.en.localeCompare(right.title.en));
  }, [catalogCategory, catalogQuery, catalogSort, catalogStatus, draftBooks]);

  const filteredCopyKeys = useMemo(() => (Object.keys(defaultSiteCopy) as DictKey[]).filter((key) => key.toLowerCase().includes(copyQuery.trim().toLowerCase())), [copyQuery]);

  function updateDraftBooks(nextBooks: Book[], message: string) {
    setBooksJson(JSON.stringify(nextBooks, null, 2));
    setDraftDirty(true);
    setNotice(message);
    setError("");
  }

  function updateBook(bookId: string, update: Partial<Book>) {
    updateDraftBooks(draftBooks.map((book) => book.id === bookId ? { ...book, ...update } : book), "Draft updated. Save changes to publish it.");
  }

  function startEditing(book: Book) {
    setEditingBook({ ...book, title: { ...book.title }, author: { ...book.author }, shortDescription: { ...book.shortDescription }, longDescription: { ...book.longDescription }, receives: { ...book.receives }, language: { ...book.language }, tags: book.tags.map((tag) => ({ ...tag })) });
    setError("");
    setNotice(`Editing ${book.title.en}. Save changes to publish your edits.`);
  }

  function updateEditingBook(update: Partial<Book>) {
    setEditingBook((book) => book ? { ...book, ...update } : book);
    setDraftDirty(true);
  }

  function updateEditingLocalized(field: "title" | "author" | "shortDescription" | "longDescription" | "receives" | "language", lang: "bn" | "en", value: string) {
    setEditingBook((book) => book ? { ...book, [field]: { ...book[field], [lang]: value } } : book);
    setDraftDirty(true);
  }

  function saveEditingBook(event: FormEvent) {
    event.preventDefault();
    if (!editingBook || !editingBook.id || !editingBook.slug || !editingBook.title.en.trim() || !editingBook.coverImage.trim() || !editingBook.category) {
      setError("ID, slug, English title, cover path, and category are required.");
      return;
    }
    if (draftBooks.some((book) => book.id !== editingBook.id && (book.id === editingBook.id || book.slug === editingBook.slug))) {
      setError("Book ID and slug must be unique.");
      return;
    }
    updateDraftBooks(draftBooks.map((book) => book.id === editingBook.id ? editingBook : book), "Book details updated in the draft.");
    setEditingBook(null);
  }

  function duplicateBook(book: Book) {
    const slug = `${book.slug}-copy`;
    if (draftBooks.some((entry) => entry.slug === slug)) {
      setError("A duplicate with this slug already exists.");
      return;
    }
    updateDraftBooks([...draftBooks, { ...book, id: `${book.id}-copy-${Date.now()}`, slug, title: { ...book.title, en: `${book.title.en} (Copy)` }, featured: false, newArrival: true }], "Book duplicated in the draft.");
  }

  function deleteBook(book: Book) {
    if (window.confirm(`Delete \"${book.title.en}\"? This only changes the draft until you save.`)) updateDraftBooks(draftBooks.filter((entry) => entry.id !== book.id), "Book removed from the draft.");
  }

  function resetDraft() {
    if (!content || (draftDirty && !window.confirm("Discard all unsaved changes?"))) return;
    applyContent(content);
    setNotice("Draft reset to the last saved version.");
  }

  function exportCatalog() {
    const url = URL.createObjectURL(new Blob([booksJson], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `canvix-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importCatalog(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (!Array.isArray(imported) || !imported.every((book) => book && typeof book === "object" && typeof book.id === "string" && typeof book.slug === "string")) throw new Error("Catalog must be an array of books with IDs and slugs.");
        if (new Set(imported.map((book) => book.id)).size !== imported.length || new Set(imported.map((book) => book.slug)).size !== imported.length) throw new Error("Book IDs and slugs must be unique.");
        setBooksJson(JSON.stringify(imported, null, 2));
        setDraftDirty(true);
        setNotice("Catalog imported as a draft. Review it before saving.");
        setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not import catalog.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function updateCategories(nextCategories: Content["categories"], message: string) {
    setCategoriesJson(JSON.stringify(nextCategories, null, 2));
    setDraftDirty(true);
    setNotice(message);
    setError("");
  }

  function updateSiteCopy(key: DictKey, lang: "bn" | "en", value: string) {
    setSiteCopy((copy) => ({ ...copy, [key]: { ...copy[key], [lang]: value } }));
    setDraftDirty(true);
  }

  function updatePaymentMethod(id: string, update: Partial<PaymentOption>) {
    setPaymentMethods((methods) => methods.map((method) => method.id === id ? { ...method, ...update } : method));
    setDraftDirty(true);
  }

  function addPaymentMethod() {
    const id = newPaymentId.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
    if (!id || !newPaymentName.trim() || !/^01[3-9]\d{8}$/.test(newPaymentNumber.trim()) || paymentMethods.some((method) => method.id === id)) {
      setError("Enter a unique ID, name, and valid Bangladesh mobile number.");
      return;
    }
    setPaymentMethods((methods) => [...methods, { id, name: newPaymentName.trim(), number: newPaymentNumber.trim(), enabled: true }]);
    setNewPaymentId("");
    setNewPaymentName("");
    setNewPaymentNumber("");
    setDraftDirty(true);
    setNotice("Payment method added to the draft.");
    setError("");
  }

  function removePaymentMethod(id: string) {
    if (paymentMethods.length <= 1) {
      setError("Keep at least one payment method.");
      return;
    }
    if (window.confirm("Remove this payment method from the draft?")) {
      setPaymentMethods((methods) => methods.filter((method) => method.id !== id));
      setDraftDirty(true);
    }
  }

  function addCategory() {
    const id = newCategoryId.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
    const categories = (() => { try { return JSON.parse(categoriesJson) as Content["categories"]; } catch { return []; } })();
    if (!id || !newCategoryEn.trim() || categories.some((category) => category.id === id)) {
      setError("Enter a unique category ID and English name.");
      return;
    }
    updateCategories([...categories, { id, name: { en: newCategoryEn.trim(), bn: newCategoryBn.trim() || newCategoryEn.trim() } }], "Category added to the draft.");
    setNewCategoryId("");
    setNewCategoryEn("");
    setNewCategoryBn("");
  }

  function deleteCategory(categoryId: string) {
    if (draftBooks.some((book) => book.category === categoryId)) {
      setError("Move or delete the books in this category before removing it.");
      return;
    }
    const categories = JSON.parse(categoriesJson) as Content["categories"];
    if (window.confirm(`Delete category \"${categoryId}\" from the draft?`)) updateCategories(categories.filter((category) => category.id !== categoryId), "Category removed from the draft.");
  }

  function renameCategory(categoryId: string) {
    const categories = JSON.parse(categoriesJson) as Content["categories"];
    const category = categories.find((entry) => entry.id === categoryId);
    if (!category) return;
    const englishName = window.prompt("New English category name", category.name.en)?.trim();
    if (!englishName) return;
    const banglaName = window.prompt("New Bangla category name", category.name.bn)?.trim() || category.name.bn;
    updateCategories(categories.map((entry) => entry.id === categoryId ? { ...entry, name: { en: englishName, bn: banglaName } } : entry), "Category renamed in the draft.");
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
        body: JSON.stringify({ version: content.version, books, categories, paymentMethods, showCategories, siteCopy }),
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
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a PNG, JPEG, or WebP cover up to 5 MB.");
      event.target.value = "";
      return;
    }
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
      setDraftDirty(true);
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
    setDraftDirty(true);
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
        <div className="admin-shell mx-auto max-w-md px-4 py-16 sm:px-6">
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
      <div className="admin-shell mx-auto max-w-6xl px-4 py-12 sm:px-6">
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
        <nav className="sticky top-[4.5rem] z-20 mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-sm backdrop-blur" aria-label="Admin sections">
          <div className="flex min-w-max gap-1 text-sm"><a className="rounded-xl px-3 py-2 text-stone-600 hover:bg-stone-100" href="#catalog">Catalog</a><a className="rounded-xl px-3 py-2 text-stone-600 hover:bg-stone-100" href="#book-editor">Add book</a><a className="rounded-xl px-3 py-2 text-stone-600 hover:bg-stone-100" href="#payments">Payments</a><a className="rounded-xl px-3 py-2 text-stone-600 hover:bg-stone-100" href="#categories">Categories</a><a className="rounded-xl px-3 py-2 text-stone-600 hover:bg-stone-100" href="#website-text">Website text</a></div>
        </nav>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Books", draftBooks.length],
            ["Featured", draftBooks.filter((book) => book.featured).length],
            ["New arrivals", draftBooks.filter((book) => book.newArrival).length],
            ["Categories", content?.categories.length ?? 0],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></div>)}
        </div>
        <section id="catalog" className="mt-8 scroll-mt-28 rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-serif text-2xl">Catalog tools</h2><p className="mt-1 text-sm text-stone-500">{filteredBooks.length} of {draftBooks.length} books shown{draftDirty ? " · Unsaved draft" : ""}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={resetDraft} disabled={!draftDirty}>Reset draft</Button>
              <Button type="button" variant="secondary" onClick={exportCatalog}>Export JSON</Button>
              <Button type="button" variant="secondary" onClick={() => importInputRef.current?.click()}>Import JSON</Button>
              <input ref={importInputRef} type="file" accept="application/json" className="sr-only" onChange={importCatalog} />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextInput aria-label="Search catalog" placeholder="Search title, author, slug" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} />
            <select aria-label="Filter catalog category" className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value)}><option value="all">All categories</option>{content?.categories.map((category) => <option key={category.id} value={category.id}>{category.name.en}</option>)}</select>
            <select aria-label="Filter catalog status" className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={catalogStatus} onChange={(event) => setCatalogStatus(event.target.value)}><option value="all">All statuses</option><option value="featured">Featured</option><option value="new">New arrivals</option></select>
            <select aria-label="Sort catalog" className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={catalogSort} onChange={(event) => setCatalogSort(event.target.value)}><option value="title">Sort by title</option><option value="price">Sort by price</option></select>
          </div>
          <div className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
            {filteredBooks.map((book) => <div key={book.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{book.title.en}</p><p className="text-xs text-stone-500">{book.category} · BDT {book.priceBdt}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => startEditing(book)}>Edit all info</Button><Button type="button" variant="secondary" onClick={() => updateBook(book.id, { featured: !book.featured })}>{book.featured ? "Unfeature" : "Feature"}</Button><Button type="button" variant="secondary" onClick={() => updateBook(book.id, { newArrival: !book.newArrival })}>{book.newArrival ? "Remove new" : "Mark new"}</Button><Button type="button" variant="secondary" onClick={() => duplicateBook(book)}>Duplicate</Button><Button type="button" variant="secondary" onClick={() => deleteBook(book)}>Delete</Button></div></div>)}
          </div>
        </section>
        {editingBook ? <form onSubmit={saveEditingBook} className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Edit published book</h2><p className="mt-1 text-sm text-stone-600">Update every book field, then save the catalog below to publish the changes.</p></div><Button type="button" variant="secondary" onClick={() => setEditingBook(null)}>Cancel</Button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Book ID" htmlFor="edit-id"><TextInput id="edit-id" value={editingBook.id} onChange={(event) => updateEditingBook({ id: event.target.value })} required /></Field>
            <Field label="Slug" htmlFor="edit-slug"><TextInput id="edit-slug" value={editingBook.slug} onChange={(event) => updateEditingBook({ slug: event.target.value })} required /></Field>
            {(["title", "author", "shortDescription", "longDescription", "receives", "language"] as const).flatMap((field) => (["en", "bn"] as const).map((lang) => <Field key={`${field}-${lang}`} label={`${field} (${lang === "en" ? "English" : "Bangla"})`} htmlFor={`edit-${field}-${lang}`}><TextInput id={`edit-${field}-${lang}`} value={editingBook[field][lang]} onChange={(event) => updateEditingLocalized(field, lang, event.target.value)} required={lang === "en"} /></Field>))}
            <Field label="Cover path" htmlFor="edit-cover"><TextInput id="edit-cover" value={editingBook.coverImage} onChange={(event) => updateEditingBook({ coverImage: event.target.value })} required /></Field>
            <Field label="Price (BDT)" htmlFor="edit-price"><TextInput id="edit-price" type="number" min="0" step="0.01" value={editingBook.priceBdt} onChange={(event) => updateEditingBook({ priceBdt: Number(event.target.value) })} required /></Field>
            <Field label="Original price (BDT, optional)" htmlFor="edit-original-price"><TextInput id="edit-original-price" type="number" min="0" step="0.01" value={editingBook.originalPriceBdt ?? ""} onChange={(event) => updateEditingBook({ originalPriceBdt: event.target.value ? Number(event.target.value) : undefined })} /></Field>
            <Field label="Category" htmlFor="edit-category"><select id="edit-category" className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={editingBook.category} onChange={(event) => updateEditingBook({ category: event.target.value })}>{content?.categories.map((category) => <option key={category.id} value={category.id}>{category.name.en}</option>)}</select></Field>
            <Field label="Pages" htmlFor="edit-pages"><TextInput id="edit-pages" type="number" min="0" value={editingBook.pages} onChange={(event) => updateEditingBook({ pages: Number(event.target.value) })} /></Field>
            <Field label="File size" htmlFor="edit-file-size"><TextInput id="edit-file-size" value={editingBook.fileSize} onChange={(event) => updateEditingBook({ fileSize: event.target.value })} /></Field>
            <Field label="Format" htmlFor="edit-format"><select id="edit-format" className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5" value={editingBook.format} onChange={(event) => updateEditingBook({ format: event.target.value as "PDF" })}><option value="PDF">PDF</option></select></Field>
            <Field label="Tags JSON" htmlFor="edit-tags"><TextArea id="edit-tags" value={JSON.stringify(editingBook.tags, null, 2)} onChange={(event) => { try { const tags = JSON.parse(event.target.value); if (Array.isArray(tags)) updateEditingBook({ tags }); } catch { setError("Tags must be valid JSON."); } }} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-stone-700"><label className="flex items-center gap-2"><input type="checkbox" checked={editingBook.featured} onChange={(event) => updateEditingBook({ featured: event.target.checked })} /> Featured</label><label className="flex items-center gap-2"><input type="checkbox" checked={editingBook.newArrival} onChange={(event) => updateEditingBook({ newArrival: event.target.checked })} /> New arrival</label></div>
          <Button type="submit" className="mt-5">Update book draft</Button>
        </form> : null}
        <form id="book-editor" onSubmit={addBook} className="mt-8 scroll-mt-28 rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
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
          <section id="payments" className="scroll-mt-28 space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Payment settings</h2>
            <p className="text-sm text-stone-500">Add bKash, Rocket, Nagad, or any other supported mobile payment account.</p>
            <div className="space-y-3">{paymentMethods.map((method) => <div key={method.id} className="grid gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-[0.8fr_1fr_1fr_auto_auto] sm:items-end"><Field label="ID" htmlFor={`payment-id-${method.id}`}><TextInput id={`payment-id-${method.id}`} value={method.id} readOnly /></Field><Field label="Name" htmlFor={`payment-name-${method.id}`}><TextInput id={`payment-name-${method.id}`} value={method.name} onChange={(event) => updatePaymentMethod(method.id, { name: event.target.value })} /></Field><Field label="Account number" htmlFor={`payment-number-${method.id}`}><TextInput id={`payment-number-${method.id}`} inputMode="numeric" value={method.number} onChange={(event) => updatePaymentMethod(method.id, { number: event.target.value })} /></Field><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={method.enabled} onChange={(event) => updatePaymentMethod(method.id, { enabled: event.target.checked })} /> Enabled</label><Button type="button" variant="secondary" onClick={() => removePaymentMethod(method.id)}>Remove</Button></div>)}</div>
            <div className="grid gap-2 border-t border-stone-100 pt-4 sm:grid-cols-3"><TextInput aria-label="New payment ID" placeholder="nagad" value={newPaymentId} onChange={(event) => setNewPaymentId(event.target.value)} /><TextInput aria-label="New payment name" placeholder="Nagad" value={newPaymentName} onChange={(event) => setNewPaymentName(event.target.value)} required /><TextInput aria-label="New payment account number" placeholder="01XXXXXXXXX" inputMode="numeric" value={newPaymentNumber} onChange={(event) => setNewPaymentNumber(event.target.value)} required /><Button type="button" variant="secondary" onClick={addPaymentMethod}>Add payment method</Button></div>
            <label className="flex items-center gap-3 text-sm text-stone-700"><input type="checkbox" checked={showCategories} onChange={(event) => { setShowCategories(event.target.checked); setDraftDirty(true); }} /> Show category list on homepage</label>
            <p className="text-xs text-stone-500">Last saved: {content ? new Date(content.updatedAt).toLocaleString() : "-"}</p>
          </section>
          <section id="catalog-json" className="scroll-mt-28 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl">Book catalog</h2>
                <p className="mt-1 text-sm text-stone-500">Use the existing Book shape. Cover paths must start with /covers/ or /assets/.</p>
              </div>
              <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">{content?.books.length ?? 0} books</span>
            </div>
            <TextArea aria-label="Book catalog JSON" className="mt-5 min-h-[32rem] font-mono text-xs" value={booksJson} onChange={(event) => { setBooksJson(event.target.value); setDraftDirty(true); }} />
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
          <section id="categories" className="scroll-mt-28 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-serif text-2xl">Categories</h2>
            <p className="mt-1 text-sm text-stone-500">Add, edit, or remove categories using localized names.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TextInput aria-label="New category ID" placeholder="category-id" value={newCategoryId} onChange={(event) => setNewCategoryId(event.target.value)} />
              <TextInput aria-label="New category English name" placeholder="English name" value={newCategoryEn} onChange={(event) => setNewCategoryEn(event.target.value)} required />
              <TextInput aria-label="New category Bangla name" placeholder="Bangla name" value={newCategoryBn} onChange={(event) => setNewCategoryBn(event.target.value)} />
              <Button type="button" variant="secondary" onClick={addCategory}>Add category</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{draftCategories.map((category) => <span key={category.id} className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600"><button type="button" className="hover:text-amber-800" onClick={() => renameCategory(category.id)}>{category.name.en}</button><label className="flex items-center gap-1"><input type="checkbox" checked={category.visible !== false} onChange={(event) => updateCategories(draftCategories.map((entry) => entry.id === category.id ? { ...entry, visible: event.target.checked } : entry), "Category visibility updated in the draft.")} /> Visible</label><button type="button" aria-label={`Delete ${category.name.en}`} className="hover:text-red-700" onClick={() => deleteCategory(category.id)}>×</button></span>)}</div>
            <TextArea aria-label="Categories JSON" className="mt-5 min-h-64 font-mono text-xs" value={categoriesJson} onChange={(event) => { setCategoriesJson(event.target.value); setDraftDirty(true); }} />
          </section>
          <section id="website-text" className="scroll-mt-28 rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-2">
            <h2 className="font-serif text-2xl">Website text editor</h2>
            <p className="mt-1 text-sm text-stone-500">Edit hero text, navigation, buttons, instructions, FAQ, SEO text, and every other dictionary-backed UI label.</p>
            <TextInput className="mt-5" aria-label="Search website text" placeholder="Search text key, for example heroTitle" value={copyQuery} onChange={(event) => setCopyQuery(event.target.value)} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">{filteredCopyKeys.map((key) => <div key={key} className="rounded-xl border border-stone-200 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">{key}</p><Field label="English" htmlFor={`copy-en-${key}`}><TextArea id={`copy-en-${key}`} value={siteCopy[key].en} onChange={(event) => updateSiteCopy(key, "en", event.target.value)} /></Field><Field label="Bangla" htmlFor={`copy-bn-${key}`}><TextArea id={`copy-bn-${key}`} value={siteCopy[key].bn} onChange={(event) => updateSiteCopy(key, "bn", event.target.value)} /></Field></div>)}</div>
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
