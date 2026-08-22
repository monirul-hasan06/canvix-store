import { Outlet } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Layout() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        {t("skip")}
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
