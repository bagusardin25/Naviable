'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import styles from '@/app/landing.module.css';

export function LandingShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);

  return (
    <div className={styles.page}>
      <a href="#konten-utama" className={styles.skip}>Lewati ke konten utama</a>
      <header className={styles.header} onKeyDown={event => {
        if (event.key === 'Escape') { setMenuOpen(false); menuTrigger.current?.focus(); }
      }}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="NaviAble — beranda">
            <Image src="/logo-only-light-3.png" alt="" width={36} height={36} />NaviAble<span className={styles.brandDot}>.</span>
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
          <div>
            <Link className={styles.brand} href="/" aria-label="NaviAble — beranda">
              <Image src="/logo-only-light-3.png" alt="" width={32} height={32} />NaviAble<span className={styles.brandDot}>.</span>
            </Link>
            <p>Informasi akses yang lebih jelas.<br />Dimulai dari Surabaya.</p>
          </div>
          <nav aria-label="Navigasi footer"><Link href="/jelajah" prefetch={false}>Jelajahi peta</Link><a href="#cara-kerja">Cara kerja</a><a href="#tentang-data">Tentang data</a><a href="#pertanyaan">Pertanyaan umum</a><Link href="/login?mode=reviewer" style={{ opacity: 0.8 }}>Portal Reviewer</Link></nav>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} NaviAble</span><span>Dibangun untuk perjalanan yang lebih terinformasi.</span><a href="#konten-utama">Kembali ke atas ↑</a></div>
      </footer>
    </div>
  );
}
