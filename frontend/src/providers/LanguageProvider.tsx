'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  locales,
  translate,
  type Locale,
  type TranslationDictionary,
} from '@/locales';

const CHANGE_EVENT = 'naviable-locale-change';
let fallbackSnapshot: Locale = DEFAULT_LOCALE;

function parseLocale(raw: string | null): Locale {
  if (raw === 'id' || raw === 'en') return raw;
  return DEFAULT_LOCALE;
}

function getStoredSnapshot(): Locale {
  if (typeof window === 'undefined') return fallbackSnapshot;
  try {
    const current = localStorage.getItem(LOCALE_STORAGE_KEY);
    const parsed = parseLocale(current);
    fallbackSnapshot = parsed;
    return parsed;
  } catch {
    return fallbackSnapshot;
  }
}

function saveLocale(locale: Locale) {
  fallbackSnapshot = locale;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* Session-only fallback */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function subscribe(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (
    path: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
  dict: TranslationDictionary;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getStoredSnapshot, () => DEFAULT_LOCALE);

  // Sync document <html lang="..."> attribute on client without hydration mismatch
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    saveLocale(newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    saveLocale(locale === 'id' ? 'en' : 'id');
  }, [locale]);

  const t = useCallback(
    (
      path: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ) => {
      return translate(locale, path, fallbackOrParams, params);
    },
    [locale]
  );

  const dict = useMemo(() => locales[locale] || locales[DEFAULT_LOCALE], [locale]);

  const formatDate = useCallback(
    (dateInput: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
      if (Number.isNaN(date.getTime())) return String(dateInput);
      const intlLocale = locale === 'id' ? 'id-ID' : 'en-US';
      return date.toLocaleDateString(intlLocale, options);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const intlLocale = locale === 'id' ? 'id-ID' : 'en-US';
      return new Intl.NumberFormat(intlLocale, options).format(value);
    },
    [locale]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      dict,
      formatDate,
      formatNumber,
    }),
    [locale, setLocale, toggleLocale, t, dict, formatDate, formatNumber]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if component is rendered outside provider (e.g. tests or isolated stories)
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (
        path: string,
        fallbackOrParams?: string | Record<string, string | number>,
        params?: Record<string, string | number>
      ) => translate(DEFAULT_LOCALE, path, fallbackOrParams, params),
      dict: locales[DEFAULT_LOCALE],
      formatDate: (dateInput: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
        const date = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
        if (Number.isNaN(date.getTime())) return String(dateInput);
        return date.toLocaleDateString('id-ID', options);
      },
      formatNumber: (val: number, opts?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat('id-ID', opts).format(val),
    };
  }
  return context;
}
