'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Screen } from '@/types';
import { Icon } from '@/components/ui/Icon';

type AppSidebarProps = {
  currentScreen: Screen;
  onSelectScreen: (screen: Screen) => void;
};

export function AppSidebar({ currentScreen, onSelectScreen }: AppSidebarProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Naviable Prototype">
        {!imgError ? (
          <Image
            src="/naviable-mark.svg"
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
          aria-label="Peta Aksesibilitas"
        >
          <Icon name="map" />
          <span>Peta</span>
        </button>
        <button
          id="nav-report"
          type="button"
          className={currentScreen === 'report' ? 'active' : ''}
          onClick={() => onSelectScreen('report')}
          aria-label="Laporkan Tempat"
        >
          <Icon name="report" />
          <span className="nav-label-full">Laporkan Tempat</span>
          <span className="nav-label-mobile">Lapor</span>
        </button>
        <button
          id="nav-dashboard"
          type="button"
          className={currentScreen === 'dashboard' ? 'active' : ''}
          onClick={() => onSelectScreen('dashboard')}
          aria-label="Dashboard Data Keterbukaan Akses"
        >
          <Icon name="dashboard" />
          <span className="nav-label-full">Data Kota</span>
          <span className="nav-label-mobile">Data</span>
        </button>
        <button
          id="nav-profile"
          type="button"
          className={currentScreen === 'profile' ? 'active' : ''}
          onClick={() => onSelectScreen('profile')}
          aria-label="Profil Kontributor"
        >
          <Icon name="user" />
          <span>Profil</span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="avatar">AR</div>
        <div>
          <strong>Ahmad Rizki</strong>
          <span>Relawan Surabaya</span>
        </div>
      </div>
    </aside>
  );
}
