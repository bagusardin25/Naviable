'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Screen } from '@/types';
import { Icon } from '@/components/ui/Icon';

type AppSidebarProps = {
  currentScreen: Screen;
  onSelectScreen: (screen: Screen) => void;
  signedIn: boolean;
};

export function AppSidebar({ currentScreen, onSelectScreen, signedIn }: AppSidebarProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="NaviAble — kembali ke beranda">
        {!imgError ? (
          <Image
            src="/branding/naviable-logo-icon-transparent.png"
            alt="NaviAble"
            width={40}
            height={40}
            className="brand-mark"
            priority
            onError={() => setImgError(true)}
          />
        ) : (
          <svg className="brand-svg-fallback" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4C14 4 9 9 9 15C9 24 20 36 20 36C20 36 31 24 31 15C31 9 26 4 20 4Z" fill="#6b46c1" />
            <path d="M20 4C26 4 31 9 31 15C31 19 28 24 20 36V20H31" fill="#0d9488" />
            <path d="M9 15C9 24 20 36 20 36V20H9" fill="#f1b80c" />
            <path d="M20 20H31C28 26 20 36 20 36V20" fill="#ec4899" />
            <ellipse cx="20" cy="22" rx="17" ry="5" stroke="#e2e8f0" strokeWidth="2" fill="none" />
          </svg>
        )}
        <span>NaviAble</span>
      </Link>

      <nav aria-label="Navigasi utama">
        <button
          id="nav-map"
          type="button"
          className={currentScreen === 'map' ? 'active' : ''}
          onClick={() => onSelectScreen('map')}
          aria-label="Jelajahi"
          aria-current={currentScreen === 'map' ? 'page' : undefined}
        >
          <Icon name="map" />
          <span>Jelajahi</span>
        </button>
        <button
          id="nav-report"
          type="button"
          className={currentScreen === 'add' ? 'active' : ''}
          onClick={() => onSelectScreen('add')}
          aria-label="Tambah Lokasi"
          aria-current={currentScreen === 'add' ? 'page' : undefined}
        >
          <Icon name="report" />
          <span className="nav-label-full">Tambah Lokasi</span>
          <span className="nav-label-mobile">Tambah</span>
        </button>
        <button
          id="nav-dashboard"
          type="button"
          className={currentScreen === 'dashboard' ? 'active' : ''}
          onClick={() => onSelectScreen('dashboard')}
          aria-label="Informasi Aksesibilitas"
          aria-current={currentScreen === 'dashboard' ? 'page' : undefined}
        >
          <Icon name="dashboard" />
          <span className="nav-label-full">Informasi Aksesibilitas</span>
          <span className="nav-label-mobile">Informasi</span>
        </button>
        <button
          id="nav-profile"
          type="button"
          className={currentScreen === 'profile' ? 'active' : ''}
          onClick={() => onSelectScreen('profile')}
          aria-label={signedIn ? 'Kontribusi Saya' : 'Masuk'}
          aria-current={currentScreen === 'profile' ? 'page' : undefined}
        >
          <Icon name="user" />
          <span className="nav-label-full">{signedIn ? 'Kontribusi Saya' : 'Masuk'}</span>
          <span className="nav-label-mobile">{signedIn ? 'Akun' : 'Masuk'}</span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="avatar"><Icon name="user" /></div>
        <div>
          <strong>{signedIn ? 'Akun kontributor' : 'Mode tamu'}</strong>
          <span>{signedIn ? 'Terima kasih telah berbagi' : 'Jelajahi tanpa akun'}</span>
        </div>
      </div>
    </aside>
  );
}
