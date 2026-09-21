import { id } from './id';
import { en } from './en';
import type { Locale, TranslationDictionary } from './types';

export * from './types';

export const locales: Record<Locale, TranslationDictionary> = {
  id,
  en,
};

export const DEFAULT_LOCALE: Locale = 'id';
export const LOCALE_STORAGE_KEY = 'naviable-locale';

/**
 * Safely resolves a nested dot-notated translation path (e.g. "nav.explore", "status.UTUH.label").
 * Automatically falls back to Indonesian ('id') if the key is missing or empty in the requested locale.
 * Replaces parameters like {count} or {name} if provided in params.
 * Accepts an optional fallback string as the 2nd argument.
 */
export function translate(
  locale: Locale,
  path: string,
  fallbackOrParams?: string | Record<string, string | number>,
  params?: Record<string, string | number>
): string {
  const fallbackString = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
  const actualParams = typeof fallbackOrParams === 'object' && fallbackOrParams !== null ? fallbackOrParams : params;

  const currentDict = locales[locale] || locales[DEFAULT_LOCALE];
  const fallbackDict = locales[DEFAULT_LOCALE];

  const keys = path.split('.');
  let currentVal: unknown = currentDict;
  let fallbackVal: unknown = fallbackDict;

  for (const key of keys) {
    if (currentVal && typeof currentVal === 'object' && key in currentVal) {
      currentVal = (currentVal as Record<string, unknown>)[key];
    } else {
      currentVal = undefined;
    }

    if (fallbackVal && typeof fallbackVal === 'object' && key in fallbackVal) {
      fallbackVal = (fallbackVal as Record<string, unknown>)[key];
    } else {
      fallbackVal = undefined;
    }
  }

  let result = typeof currentVal === 'string'
    ? currentVal
    : typeof fallbackVal === 'string'
    ? fallbackVal
    : (fallbackString ?? path);

  if (actualParams && typeof result === 'string') {
    for (const [pKey, pVal] of Object.entries(actualParams)) {
      result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
  }

  return result;
}
