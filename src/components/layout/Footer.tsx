import { Link } from "react-router-dom";
import { STORE_NAME } from "../../data/site";
import { useLanguage } from "../../i18n/LanguageContext";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-900 text-stone-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl text-stone-50">{STORE_NAME}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-stone-400">
            {t("footerBlurb")}
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            {STORE_NAME}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/books" className="hover:text-white">
                {t("navBooks")}
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-white">
                {t("navCategories")}
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-white">
                {t("navHow")}
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-white">
                {t("navFaq")}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                {t("navContact")}
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-white">
                Admin
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            {t("navContact")}
          </p>
          <Link className="mt-3 inline-block text-sm text-amber-200/90 hover:text-white" to="/contact">
            {t("navContact")}
          </Link>
        </div>
      </div>
      <div className="border-t border-stone-800 px-4 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {STORE_NAME}. {t("copyright")}
      </div>
    </footer>
  );
}
