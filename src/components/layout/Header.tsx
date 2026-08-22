import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { STORE_NAME } from "../../data/site";
import { useLanguage } from "../../i18n/LanguageContext";

const links = [
  { to: "/", key: "navHome" as const, end: true },
  { to: "/books", key: "navBooks" as const, end: false },
  { to: "/categories", key: "navCategories" as const, end: false },
  { to: "/how-it-works", key: "navHow" as const, end: false },
  { to: "/faq", key: "navFaq" as const, end: false },
  { to: "/contact", key: "navContact" as const, end: false },
];

export function Header() {
  const { t, lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, lang]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f3ec]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLink
          to="/"
          className="shrink-0 font-serif text-lg font-semibold tracking-tight text-stone-900 sm:text-2xl"
        >
          {STORE_NAME}
        </NavLink>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? "text-amber-900" : "text-stone-600 hover:text-stone-900"}`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className="flex rounded-full border border-stone-300 bg-white p-0.5 text-xs font-medium"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              className={`rounded-full px-2.5 py-1.5 ${lang === "bn" ? "bg-amber-800 text-amber-50" : "text-stone-700"}`}
              onClick={() => setLang("bn")}
            >
              {t("langBn")}
            </button>
            <button
              type="button"
              className={`rounded-full px-2.5 py-1.5 ${lang === "en" ? "bg-amber-800 text-amber-50" : "text-stone-700"}`}
              onClick={() => setLang("en")}
            >
              {t("langEn")}
            </button>
          </div>
          <button
            type="button"
            className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("close") : t("menu")}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-stone-200 px-4 py-4 lg:hidden"
          aria-label="Mobile"
        >
          <ul className="space-y-1">
            {links.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className="block rounded-xl px-3 py-3 text-stone-800 hover:bg-stone-200/60"
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
