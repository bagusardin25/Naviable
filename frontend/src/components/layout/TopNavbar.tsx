'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';

type TopNavbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAccessibility: () => void;
};

export function TopNavbar({
  searchQuery,
  onSearchChange,
  onOpenAccessibility,
}: TopNavbarProps) {
  const [voiceNotice, setVoiceNotice] = useState(false);

  function handleVoiceSearch() {
    setVoiceNotice(true);
    setTimeout(() => setVoiceNotice(false), 2500);
  }

  return (
    <header className="topbar">
      <div className="location-chip">
        <Icon name="location" size={17} />
        <span>Surabaya, Indonesia</span>
      </div>

      <Link href="/" className="topbar-mobile-brand" aria-label="NaviAble — kembali ke beranda">
        <Image
          src="/branding/naviable-logo-icon-transparent.png"
          alt="NaviAble"
          width={30}
          height={30}
          className="topbar-mobile-logo"
        />
      </Link>

      <div className="search-container">
        <label className="search-box" htmlFor="search-input">
          <Icon name="search" />
          <input
            id="search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari puskesmas, halte, taman, stasiun..."
            aria-label="Cari tempat aksesibel di Surabaya"
          />
          <button
            id="btn-search-voice"
            type="button"
            aria-label="Pencarian suara"
            onClick={handleVoiceSearch}
            title="Pencarian suara"
          >
            <Icon name="mic" />
          </button>
        </label>
        {voiceNotice && (
          <div className="voice-toast" role="status">
            Pencarian suara belum didukung di peramban ini. Silakan gunakan pencarian teks.
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <Link
          href="/login"
          className="topbar-icon-button"
          aria-label="Masuk ke akun atau ganti kontributor"
          title="Masuk / Akun"
        >
          <Icon name="user" size={18} />
        </Link>
        <button
          id="btn-accessibility"
          type="button"
          className="a11y-button"
          onClick={onOpenAccessibility}
        >
          <Icon name="access" />
          <span>Aksesibilitas</span>
        </button>
      </div>
    </header>
  );
}
