'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { ReviewerSidebar } from '@/components/reviewer/ReviewerSidebar';
import styles from './reviewer.module.css';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings } = useAccessibility();

  return (
    <div
      className={`${styles.shell} ${settings.darkMode ? 'dark' : ''}`}
      data-dark={settings.darkMode}
      data-contrast={settings.contrast}
      data-large-text={settings.largeText}
      data-reduce-motion={settings.reduceMotion}
      data-dyslexia={settings.dyslexia}
    >
      <ReviewerSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className={styles.main}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className={styles.topBarTitle}>
            Panel Verifikasi Data Aksesibilitas
          </div>
          <div className={styles.topBarStatus}>
            <span className={styles.topBarStatusDot} aria-hidden="true" />
            <span>Sesi Terverifikasi</span>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
