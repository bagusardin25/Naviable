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
      <Link href="/" className="brand" aria-label="Naviable — kembali ke beranda">
        {!imgError ? (
          <Image
            src="/logo-only-light-3.png"
            alt="Naviable Logo"
            width={40}
            height={40}
            className="brand-mark"
            priority
            onError={() => setImgError(true)}
          />
        ) : (
          <svg className="brand-svg-fallback" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="#6d45cc" />
            <circle cx="20" cy="13" r="3.5" fill="#ffffff" />
            <path d="M19 19L16 26L23 28L25 34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="30" r="6" stroke="#ffffff" strokeWidth="2.5" />
          </svg>
        )}
        <span>Naviable</span>
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
