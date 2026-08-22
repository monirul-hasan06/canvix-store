import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translate, type DictKey } from "./dictionary";
import type { Lang, Localized } from "../types/book";
import { useContent } from "../context/ContentContext";

const STORAGE_KEY = "canvix-store:lang";
const THEME_KEY = "canvix-store:theme";
type Theme = "light" | "dark";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
  loc: (value: Localized) => string;
  theme: Theme;
  toggleTheme: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {
    /* ignore */
  }
  return "bn";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
  const { siteCopy } = useContent();

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  const t = useCallback((key: DictKey) => siteCopy[key]?.[lang] || translate(lang, key), [lang, siteCopy]);
  const loc = useCallback((value: Localized) => value[lang], [lang]);
  const toggleTheme = useCallback(() => setTheme((current) => current === "dark" ? "light" : "dark"), []);

  const value = useMemo(
    () => ({ lang, setLang, t, loc, theme, toggleTheme }),
    [lang, setLang, t, loc, theme, toggleTheme],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
