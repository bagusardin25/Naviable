'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { AccessibilitySettings } from '@/types';

const STORAGE_KEY = 'naviable_a11y_settings';
const CHANGE_EVENT = 'naviable-a11y-change';
const defaults: AccessibilitySettings = { darkMode: false, contrast: false, largeText: false, reduceMotion: false, dyslexia: false };
const defaultSnapshot = JSON.stringify(defaults);
let fallbackSnapshot = defaultSnapshot;

function snapshot() {
  try { return localStorage.getItem(STORAGE_KEY) ?? fallbackSnapshot; }
  catch { return fallbackSnapshot; }
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
function parse(raw: string): AccessibilitySettings {
  try {
    const value = JSON.parse(raw);
    return {
      darkMode: value?.darkMode === true,
      contrast: value?.contrast === true,
      largeText: value?.largeText === true,
      reduceMotion: value?.reduceMotion === true,
      dyslexia: value?.dyslexia === true,
    };
  } catch { return defaults; }
}
function save(value: AccessibilitySettings) {
  fallbackSnapshot = JSON.stringify(value);
  try { localStorage.setItem(STORAGE_KEY, fallbackSnapshot); } catch { /* Preferences still work for this session. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useAccessibility() {
  // The server snapshot also supplies the first hydration render; stored preferences follow safely.
  const raw = useSyncExternalStore(subscribe, snapshot, () => defaultSnapshot);
  const settings = useMemo(() => parse(raw), [raw]);
  function update<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) {
    save({ ...parse(snapshot()), [key]: value });
  }
  return {
    settings,
    setDarkMode: (value: boolean) => update('darkMode', value),
    setContrast: (value: boolean) => update('contrast', value),
    setLargeText: (value: boolean) => update('largeText', value),
    setReduceMotion: (value: boolean) => update('reduceMotion', value),
    setDyslexia: (value: boolean) => update('dyslexia', value),
    resetSettings: () => save(defaults),
  };
}
