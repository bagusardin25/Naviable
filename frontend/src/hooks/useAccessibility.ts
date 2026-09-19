'use client';

import { useAccessibilityContext } from '@/providers/AccessibilityProvider';
import type { AccessibilityPreferences, AccessibilitySettings, AccessibilityWidgetPosition } from '@/types';

export function useAccessibility() {
  const context = useAccessibilityContext();
  return context;
}

export type { AccessibilityPreferences, AccessibilitySettings, AccessibilityWidgetPosition };
