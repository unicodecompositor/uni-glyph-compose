import { useState, useCallback, createContext, useContext } from 'react';
import { 
  SupportedLocale, 
  Translations, 
  getTranslations, 
  getSavedLocale, 
  saveLocale,
  SUPPORTED_LOCALES,
  LocaleInfo,
} from '@/lib/i18n';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: Translations;
  locales: LocaleInfo[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocaleProvider() {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getSavedLocale());
  
  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  }, []);
  
  const t = getTranslations(locale);
  
  return {
    locale,
    setLocale,
    t,
    locales: SUPPORTED_LOCALES,
    LocaleContext,
  };
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    const locale = getSavedLocale();
    return {
      locale,
      setLocale: () => {},
      t: getTranslations(locale),
      locales: SUPPORTED_LOCALES,
    };
  }
  return context;
}

export { LocaleContext };
