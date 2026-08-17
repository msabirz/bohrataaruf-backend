'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Locale = 'en' | 'lud';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {} });

const STORAGE_KEY = 'bohra-taaruf-locale';

// Feature flag — the Lisan-ud-Dawat localization work is paused for now;
// flip NEXT_PUBLIC_LOCALIZATION_ENABLED=true (and redeploy) to bring it
// back without reverting any code.
export const LOCALIZATION_ENABLED = process.env.NEXT_PUBLIC_LOCALIZATION_ENABLED === 'true';

// Marketing-site-only (Mode B pre-launch experience) — not mounted for the
// authenticated app, which has no localized strings yet.
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    if (!LOCALIZATION_ENABLED) return; // stay 'en' — ignore any stored/query preference

    // ?locale= override takes priority (useful for QA/shareable links),
    // otherwise fall back to the persisted choice.
    const fromQuery = new URLSearchParams(window.location.search).get('locale');
    if (fromQuery === 'en' || fromQuery === 'lud') {
      setLocaleState(fromQuery);
      window.localStorage.setItem(STORAGE_KEY, fromQuery);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'lud') setLocaleState(stored);
  }, []);

  const setLocale = (next: Locale) => {
    if (!LOCALIZATION_ENABLED) return;
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <LocaleContext.Provider value={{ locale: LOCALIZATION_ENABLED ? locale : 'en', setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
