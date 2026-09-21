'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ReviewerSidebar } from '@/components/reviewer/ReviewerSidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import styles from './reviewer.module.css';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <ReviewerSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className={styles.main}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? t('common.close') : 'Buka menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className={styles.topBarTitle}>
            {t('reviewer.panelTitle')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={styles.topBarStatus}>
              <span className={styles.topBarStatusDot} aria-hidden="true" />
              <span>{t('reviewer.sessionVerified')}</span>
            </div>
            <LanguageSwitcher size="sm" />
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
