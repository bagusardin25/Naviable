'use client';

import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'compact' | 'header' | 'footer';
  size?: 'sm' | 'md' | 'lg';
}

export function LanguageSwitcher({
  className = '',
  variant = 'compact',
  size,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();

  const isId = locale === 'id';
  const isEn = locale === 'en';

  const groupAriaLabel = isId ? 'Pilihan bahasa antarmuka' : 'Interface language selection';

  return (
    <div
      className={`lang-switcher-segmented ${variant ? `lang-switcher-${variant}` : ''} ${size ? `lang-switcher-${size}` : ''} ${className}`.trim()}
      role="group"
      aria-label={groupAriaLabel}
    >
      <button
        type="button"
        className={`lang-btn ${isId ? 'active' : ''}`}
        onClick={() => setLocale('id')}
        aria-pressed={isId}
        aria-label="Bahasa Indonesia"
        title="Bahasa Indonesia"
      >
        <span>ID</span>
      </button>

      <span className="lang-separator" aria-hidden="true">|</span>

      <button
        type="button"
        className={`lang-btn ${isEn ? 'active' : ''}`}
        onClick={() => setLocale('en')}
        aria-pressed={isEn}
        aria-label="English"
        title="English"
      >
        <span>EN</span>
      </button>
    </div>
  );
}
