'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  AccessibilityPreferences,
  AccessibilityWidgetPosition,
  DEFAULT_A11Y_PREFERENCES,
} from '@/types';

export const PRIMARY_STORAGE_KEY = 'naviable-accessibility-preferences';
const LEGACY_STORAGE_KEYS = [
  'naviable_a11y_settings',
  'accessibility-settings',
  'accessibilityPreferences',
];
const CHANGE_EVENT = 'naviable-a11y-change';

const VALID_POSITIONS: AccessibilityWidgetPosition[] = [
  'left',
  'right',
];

const defaultSnapshot = JSON.stringify(DEFAULT_A11Y_PREFERENCES);
let fallbackSnapshot = defaultSnapshot;

export function parsePreferences(raw: string | null): AccessibilityPreferences {
  if (!raw) return DEFAULT_A11Y_PREFERENCES;
  try {
    const val = JSON.parse(raw);

    // Migrate widgetPosition to 'left' | 'right'
    let pos: AccessibilityWidgetPosition = DEFAULT_A11Y_PREFERENCES.widgetPosition;
    if (VALID_POSITIONS.includes(val?.widgetPosition)) {
      pos = val.widgetPosition;
    } else if (typeof val?.widgetPosition === 'string') {
      if (val.widgetPosition.startsWith('left')) {
        pos = 'left';
      } else if (val.widgetPosition.startsWith('right')) {
        pos = 'right';
      }
    }

    // Migrate textScale from number or fallback to legacy largeText
    let textScale = 100;
    if (typeof val?.textScale === 'number' && !Number.isNaN(val.textScale)) {
      textScale = Math.max(100, Math.min(200, Math.round(val.textScale)));
    } else if (val?.largeText === true) {
      textScale = 130;
    }

    const highlightInteractive =
      val?.highlightInteractive === true || val?.highlightLinks === true;

    return {
      darkMode: val?.darkMode === true,
      contrast: val?.contrast === true,
      textScale,
      reduceMotion: val?.reduceMotion === true,
      dyslexia: val?.dyslexia === true,
      motorMode: val?.motorMode === true,
      colorBlind: val?.colorBlind === true,
      highlightInteractive,
      readingGuide: val?.readingGuide === true,
      voiceMode: val?.voiceMode === true,
      widgetPosition: pos,
      largeText: textScale > 100,
      highlightLinks: highlightInteractive,
    };
  } catch {
    return DEFAULT_A11Y_PREFERENCES;
  }
}

function getStoredSnapshot(): string {
  if (typeof window === 'undefined') return fallbackSnapshot;
  try {
    const current = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (current) {
      const normalized = JSON.stringify(parsePreferences(current));
      if (normalized !== current) {
        localStorage.setItem(PRIMARY_STORAGE_KEY, normalized);
      }
      fallbackSnapshot = normalized;
      return normalized;
    }

    // Check legacy storage keys for seamless migration
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyVal = localStorage.getItem(legacyKey);
      if (legacyVal) {
        const migrated = parsePreferences(legacyVal);
        const serialized = JSON.stringify(migrated);
        localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
        localStorage.removeItem(legacyKey);
        fallbackSnapshot = serialized;
        return serialized;
      }
    }

    return fallbackSnapshot;
  } catch {
    return fallbackSnapshot;
  }
}

function savePreferences(prefs: AccessibilityPreferences) {
  const serialized = JSON.stringify(prefs);
  fallbackSnapshot = serialized;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
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

export interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  settings: AccessibilityPreferences; // alias
  isWidgetOpen: boolean;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  setDarkMode: (val: boolean) => void;
  setContrast: (val: boolean) => void;
  setTextScale: (scale: number) => void;
  setLargeText: (val: boolean) => void;
  setReduceMotion: (val: boolean) => void;
  setDyslexia: (val: boolean) => void;
  setMotorMode: (val: boolean) => void;
  setColorBlind: (val: boolean) => void;
  setHighlightInteractive: (val: boolean) => void;
  setHighlightLinks: (val: boolean) => void;
  setReadingGuide: (val: boolean) => void;
  setVoiceMode: (val: boolean) => void;
  setWidgetPosition: (pos: AccessibilityWidgetPosition) => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getStoredSnapshot, () => defaultSnapshot);
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  // Synchronize CSS classes and semantic data attributes on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--a11y-text-scale', String(preferences.textScale / 100));
    root.setAttribute('data-a11y-text-scale', String(preferences.textScale));

    root.classList.toggle('dark', preferences.darkMode);
    root.classList.toggle('contrast-mode', preferences.contrast);
    root.classList.toggle('high-contrast', preferences.contrast);
    root.classList.toggle('large-text', preferences.largeText);
    root.classList.toggle('reduce-motion', preferences.reduceMotion);
    root.classList.toggle('dyslexia-mode', preferences.dyslexia);
    root.classList.toggle('motor-mode', preferences.motorMode);
    root.classList.toggle('colorblind-mode', preferences.colorBlind);
    root.classList.toggle('highlight-links', preferences.highlightInteractive);
    root.classList.toggle('highlight-interactive', preferences.highlightInteractive);

    root.setAttribute('data-a11y-dark', String(preferences.darkMode));
    root.setAttribute('data-a11y-contrast', String(preferences.contrast));
    root.setAttribute('data-a11y-high-contrast', String(preferences.contrast));
    root.setAttribute('data-a11y-large-text', String(preferences.largeText));
    root.setAttribute('data-a11y-reduce-motion', String(preferences.reduceMotion));
    root.setAttribute('data-a11y-dyslexia', String(preferences.dyslexia));
    root.setAttribute('data-a11y-motor', String(preferences.motorMode));
    root.setAttribute('data-a11y-color-blind', String(preferences.colorBlind));
    root.setAttribute('data-a11y-highlight-links', String(preferences.highlightInteractive));
    root.setAttribute('data-a11y-highlight-interactive', String(preferences.highlightInteractive));
  }, [preferences]);

  const update = useCallback(
    <K extends keyof AccessibilityPreferences>(
      key: K,
      value: AccessibilityPreferences[K]
    ) => {
      savePreferences({ ...preferences, [key]: value });
    },
    [preferences]
  );

  const value: AccessibilityContextValue = useMemo(
    () => ({
      preferences,
      settings: preferences,
      isWidgetOpen,
      openWidget: () => setIsWidgetOpen(true),
      closeWidget: () => setIsWidgetOpen(false),
      toggleWidget: () => setIsWidgetOpen((prev) => !prev),
      setDarkMode: (val) => update('darkMode', val),
      setContrast: (val) => update('contrast', val),
      setTextScale: (scale) => {
        const clamped = Math.max(100, Math.min(200, Math.round(scale)));
        savePreferences({
          ...preferences,
          textScale: clamped,
          largeText: clamped > 100,
        });
      },
      setLargeText: (val) => {
        const scale = val ? 130 : 100;
        savePreferences({
          ...preferences,
          textScale: scale,
          largeText: val,
        });
      },
      setReduceMotion: (val) => update('reduceMotion', val),
      setDyslexia: (val) => update('dyslexia', val),
      setMotorMode: (val) => update('motorMode', val),
      setColorBlind: (val) => update('colorBlind', val),
      setHighlightInteractive: (val) => {
        savePreferences({
          ...preferences,
          highlightInteractive: val,
          highlightLinks: val,
        });
      },
      setHighlightLinks: (val) => {
        savePreferences({
          ...preferences,
          highlightInteractive: val,
          highlightLinks: val,
        });
      },
      setReadingGuide: (val) => update('readingGuide', val),
      setVoiceMode: (val) => update('voiceMode', val),
      setWidgetPosition: (pos) => update('widgetPosition', pos),
      resetSettings: () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        savePreferences(DEFAULT_A11Y_PREFERENCES);
      },
    }),
    [preferences, isWidgetOpen, update]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityContext(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    // Graceful fallback for components used outside provider or tests
    return {
      preferences: DEFAULT_A11Y_PREFERENCES,
      settings: DEFAULT_A11Y_PREFERENCES,
      isWidgetOpen: false,
      openWidget: () => {},
      closeWidget: () => {},
      toggleWidget: () => {},
      setDarkMode: () => {},
      setContrast: () => {},
      setTextScale: () => {},
      setLargeText: () => {},
      setReduceMotion: () => {},
      setDyslexia: () => {},
      setMotorMode: () => {},
      setColorBlind: () => {},
      setHighlightInteractive: () => {},
      setHighlightLinks: () => {},
      setReadingGuide: () => {},
      setVoiceMode: () => {},
      setWidgetPosition: () => {},
      resetSettings: () => {},
    };
  }
  return context;
}
