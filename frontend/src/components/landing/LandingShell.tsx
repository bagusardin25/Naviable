'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { useAccessibility } from '@/hooks/useAccessibility';
import styles from '@/app/landing.module.css';

export function LandingShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const preferences = useRef<HTMLDetailsElement>(null);
  const { settings, setContrast, setLargeText, setReduceMotion, setDyslexia, resetSettings } = useAccessibility();

  return (
    <div className={styles.page} data-contrast={settings.contrast} data-large-text={settings.largeText} data-reduce-motion={settings.reduceMotion} data-dyslexia={settings.dyslexia}>
      <a href="#konten-utama" className={styles.skip}>Lewati ke konten utama</a>
      <header className={styles.header} onKeyDown={event => {
        if (event.key === 'Escape') { setMenuOpen(false); menuTrigger.current?.focus(); }
      }}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="Naviable — beranda">
            <Image src="/naviable-mark.svg" alt="" width={36} height={36} />Naviable<span className={styles.brandDot}>.</span>
          </Link>
          <nav id="landing-navigation" aria-label="Navigasi beranda" className={styles.nav} data-open={menuOpen}>
            <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>Cara kerja</a>
            <a href="#rantai-akses" onClick={() => setMenuOpen(false)}>Rantai akses</a>
            <a href="#tentang-data" onClick={() => setMenuOpen(false)}>Tentang data</a>
            <Link href="/login" className={styles.signIn}>Masuk <Icon name="chevron" size={15} /></Link>
          </nav>
          <Link href="/jelajah" prefetch={false} className={styles.headerCta}>Jelajahi Peta <Icon name="chevron" size={17} /></Link>
          <button ref={menuTrigger} type="button" className={styles.menuButton} aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'close' : 'list'} />
          </button>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div><Link className={styles.brand} href="/" aria-label="Naviable — beranda"><Image src="/naviable-mark.svg" alt="" width={32} height={32} />Naviable<span className={styles.brandDot}>.</span></Link><p>Informasi akses yang lebih jelas.<br />Dimulai dari Surabaya.</p></div>
          <nav aria-label="Navigasi footer"><Link href="/jelajah" prefetch={false}>Jelajahi peta</Link><a href="#cara-kerja">Cara kerja</a><a href="#tentang-data">Tentang data</a><a href="#pertanyaan">Pertanyaan umum</a></nav>
          <details ref={preferences} className={styles.preferences} onKeyDown={event => {
            if (event.key === 'Escape' && preferences.current) { preferences.current.open = false; preferences.current.querySelector('summary')?.focus(); }
          }}>
            <summary><Icon name="access" size={18} /> Tampilan aksesibel <Icon name="chevron" size={16} /></summary>
            <div className={styles.preferenceOptions}>
              <label><input type="checkbox" checked={settings.contrast} onChange={e => setContrast(e.target.checked)} />Kontras tinggi</label>
              <label><input type="checkbox" checked={settings.largeText} onChange={e => setLargeText(e.target.checked)} />Teks lebih besar</label>
              <label><input type="checkbox" checked={settings.reduceMotion} onChange={e => setReduceMotion(e.target.checked)} />Kurangi gerakan</label>
              <label><input type="checkbox" checked={settings.dyslexia} onChange={e => setDyslexia(e.target.checked)} />Font alternatif</label>
              <button type="button" onClick={resetSettings}>Kembalikan ke awal</button>
            </div>
          </details>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Naviable</span><span>Dibangun untuk perjalanan yang lebih terinformasi.</span><a href="#konten-utama">Kembali ke atas ↑</a></div>
      </footer>
    </div>
  );
}
