'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

type TopNavbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAccessibility: () => void;
  accountHref: string;
  signedIn: boolean;
  onOpenAuth?: () => void;
};

export function TopNavbar({
  searchQuery,
  onSearchChange,
  onOpenAccessibility,
  accountHref,
  signedIn,
  onOpenAuth,
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
        {signedIn ? (
          <Link
            href={accountHref}
            className="topbar-icon-button"
            aria-label="Kontribusi Saya"
            title="Profil Kontributor"
          >
            <Icon name="user" size={18} />
          </Link>
        ) : onOpenAuth ? (
          <button
            type="button"
            className="topbar-icon-button"
            onClick={onOpenAuth}
            aria-label="Masuk untuk berkontribusi"
            title="Masuk / Daftar"
          >
            <Icon name="user" size={18} />
          </button>
        ) : (
          <Link
            href={accountHref}
            className="topbar-icon-button"
            aria-label="Masuk untuk berkontribusi"
            title="Masuk / Akun"
          >
            <Icon name="user" size={18} />
          </Link>
        )}
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
