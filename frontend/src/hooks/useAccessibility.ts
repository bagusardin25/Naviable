'use client';

import { useState } from 'react';
import { AccessibilitySettings } from '@/types';

const STORAGE_KEY = 'naviable_a11y_settings';

const defaultSettings: AccessibilitySettings = {
  contrast: false,
  largeText: false,
  reduceMotion: false,
  dyslexia: false,
};

function getInitialSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(getInitialSettings);

  function updateSetting<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  function resetSettings() {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return {
    settings,
    setContrast: (val: boolean) => updateSetting('contrast', val),
    setLargeText: (val: boolean) => updateSetting('largeText', val),
    setReduceMotion: (val: boolean) => updateSetting('reduceMotion', val),
    setDyslexia: (val: boolean) => updateSetting('dyslexia', val),
    resetSettings,
  };
}
