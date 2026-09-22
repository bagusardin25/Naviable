'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import styles from '@/app/landing.module.css';

export function LandingShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);

  return (
    <div className={styles.page}>
      <a href="#konten-utama" className={styles.skip}>{t('landing.skipToMain')}</a>
      <header className={styles.header} onKeyDown={event => {
        if (event.key === 'Escape') { setMenuOpen(false); menuTrigger.current?.focus(); }
      }}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={t('landing.navHome')}>
            <BrandLogo size={36} priority />
            <span>NaviAble</span>
          </Link>
          <nav id="landing-navigation" aria-label={t('landing.navHome')} className={styles.nav} data-open={menuOpen}>
            <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>{t('landing.howItWorks')}</a>
            <a href="#rantai-akses" onClick={() => setMenuOpen(false)}>{t('landing.accessChain')}</a>
            <a href="#tentang-data" onClick={() => setMenuOpen(false)}>{t('landing.aboutData')}</a>
            <Link href="/login" className={styles.signIn}>{t('nav.signIn')} <Icon name="chevron" size={15} /></Link>
          </nav>
          <div className={styles.headerActions}>
            <LanguageSwitcher variant="header" size="sm" />
            <Link href="/jelajah" prefetch={false} className={styles.headerCta}>{t('landing.exploreMap')} <Icon name="chevron" size={17} /></Link>
            <button ref={menuTrigger} type="button" className={styles.menuButton} aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? (t('common.close')) : 'Menu'} onClick={() => setMenuOpen(!menuOpen)}>
              <Icon name={menuOpen ? 'close' : 'list'} />
            </button>
          </div>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div>
            <Link className={styles.brand} href="/" aria-label={t('landing.navHome')}>
              <BrandLogo size={32} />
              <span>NaviAble</span>
            </Link>
            <p>{t('landing.footerBrandDesc')}</p>
          </div>
          <nav aria-label={t('landing.footerNavLabel')}>
            <Link href="/jelajah" prefetch={false}>{t('landing.exploreMap')}</Link>
            <a href="#cara-kerja">{t('landing.howItWorks')}</a>
            <a href="#tentang-data">{t('landing.aboutData')}</a>
            <a href="#pertanyaan">{t('landing.faq')}</a>
            <Link href="/login?mode=reviewer" style={{ opacity: 0.8 }}>{t('nav.reviewerPortal')}</Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} NaviAble</span>
          <span>{t('landing.footerCopyrightSuffix')}</span>
          <a href="#konten-utama">{t('landing.footerBackToTop') /* Kembali ke atas ↑ */}</a>
        </div>
      </footer>
    </div>
  );
}
