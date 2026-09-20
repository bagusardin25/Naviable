'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import type { AuthUserProfile } from '@/lib/auth/user-profile';

type TopNavbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit?: (query: string, source: 'voice' | 'text') => void;
  onOpenAccessibility?: () => void;
  accountHref: string;
  authReady: boolean;
  userProfile: AuthUserProfile | null;
  onOpenAuth?: () => void;
};

export function TopNavbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onOpenAccessibility,
  accountHref,
  authReady,
  userProfile,
  onOpenAuth,
}: TopNavbarProps) {
  const [voiceNotification, setVoiceNotification] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);
  const [voiceAnnouncement, setVoiceAnnouncement] = useState('');
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { isWidgetOpen, toggleWidget } = useAccessibility();

  const showNotification = useCallback(
    (message: string, type: 'info' | 'error' | 'success' = 'info', duration = 4000) => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setVoiceNotification({ message, type });
      dismissTimerRef.current = setTimeout(() => {
        setVoiceNotification(null);
      }, duration);
    },
    []
  );

  const {
    isSupported,
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    cancelListening,
  } = useVoiceSearch({
    lang: 'id-ID',
    onResult: (transcript) => {
      onSearchChange(transcript);
      onSearchSubmit?.(transcript, 'voice');
      showNotification(`Mencari "${transcript}"`, 'success', 3000);
      setVoiceAnnouncement(`Hasil pencarian suara diterapkan: ${transcript}`);
    },
    onError: (err) => {
      showNotification(err, 'error', 4500);
      setVoiceAnnouncement(`Kesalahan pencarian suara: ${err}`);
    },
  });

  const handleVoiceSearchClick = () => {
    if (isListening) {
      stopListening();
      setVoiceAnnouncement('Pencarian suara dihentikan.');
      return;
    }

    if (!isSupported) {
      showNotification(
        'Pencarian suara belum didukung di peramban ini. Silakan gunakan peramban berbasis Chromium (Chrome/Edge) atau gunakan pencarian teks.',
        'info',
        4500
      );
      setVoiceAnnouncement('Pencarian suara belum didukung di peramban ini. Silakan gunakan pencarian teks.');
      return;
    }

    setVoiceAnnouncement('Mendengarkan suara. Silakan sebutkan nama tempat atau fasilitas.');
    startListening();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isListening) {
      cancelListening();
      setVoiceAnnouncement('Pencarian suara dibatalkan.');
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit?.(searchQuery, 'text');
    }
  };

  const handleAccessibilityClick = () => {
    if (onOpenAccessibility) {
      onOpenAccessibility();
    } else {
      toggleWidget();
    }
  };

  return (
    <header className="topbar">
      <div className="location-chip">
        <Icon name="location" size={17} />
        <span>Surabaya, Indonesia</span>
      </div>

      <Link href="/" className="topbar-mobile-brand" aria-label="NaviAble — kembali ke beranda">
        <Image
          src="/logo-only-light-3.png"
          alt="NaviAble"
          width={30}
          height={30}
          className="topbar-mobile-logo"
        />
      </Link>

      <div className="search-container" onKeyDown={handleKeyDown}>
        <label className="search-box" htmlFor="search-input">
          <Icon name="search" />
          <input
            id="search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Cari puskesmas, halte, taman, stasiun..."
            aria-label="Cari tempat aksesibel di Surabaya"
          />
          <button
            id="btn-search-voice"
            type="button"
            className={`search-voice-btn ${isListening ? 'listening' : ''}`}
            aria-label={
              isListening
                ? 'Sedang mendengarkan ucapan... Klik untuk selesai'
                : 'Mulai pencarian suara'
            }
            aria-pressed={isListening}
            onClick={handleVoiceSearchClick}
            title={isListening ? 'Selesai mendengarkan' : 'Pencarian suara'}
          >
            <Icon name="mic" size={18} />
            {isListening && <span className="voice-pulse-ring" aria-hidden="true" />}
          </button>
        </label>

        {/* Live region announcement for screen readers */}
        <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
          {voiceAnnouncement}
        </div>

        {/* Panel status suara saat aktif mendengarkan */}
        {isListening && (
          <div className="voice-search-card listening" role="region" aria-label="Status pencarian suara">
            <div className="voice-listening-content">
              <div className="voice-wave-indicator" aria-hidden="true">
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
              </div>
              <div className="voice-listening-info">
                <p className="voice-status-title">Mendengarkan suara...</p>
                <p className="voice-transcript-preview">
                  {interimTranscript
                    ? `“${interimTranscript}”`
                    : 'Sebutkan nama tempat (contoh: Puskesmas Jagir, Taman Bungkul)'}
                </p>
              </div>
              <div className="voice-card-actions">
                <button
                  type="button"
                  className="voice-cancel-btn"
                  onClick={cancelListening}
                  aria-label="Batalkan pencarian suara"
                  title="Batal"
                >
                  <Icon name="x" size={14} />
                  <span>Batal</span>
                </button>
                <button
                  type="button"
                  className="voice-done-btn"
                  onClick={stopListening}
                  aria-label="Selesai berbicara"
                  title="Selesai"
                >
                  <Icon name="check" size={14} />
                  <span>Selesai</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifikasi suara / pesan error / info saat tidak sedang mendengarkan */}
        {!isListening && voiceNotification && (
          <div
            className={`voice-toast ${
              voiceNotification.type === 'error'
                ? 'voice-toast-error'
                : voiceNotification.type === 'success'
                ? 'voice-toast-success'
                : ''
            }`}
            role="status"
          >
            <span>{voiceNotification.message}</span>
            <button
              type="button"
              className="voice-toast-close-btn"
              onClick={() => setVoiceNotification(null)}
              aria-label="Tutup notifikasi"
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {!authReady ? (
          <span className="topbar-icon-button topbar-auth-loading" role="status" aria-label="Memeriksa sesi akun">
            <Icon name="user" size={18} />
          </span>
        ) : userProfile ? (
          <Link
            href={accountHref}
            className="topbar-account-button"
            aria-label={`Buka Kontribusi Saya untuk ${userProfile.displayName}`}
            title={`${userProfile.displayName} · ${userProfile.email}`}
          >
            <span className="topbar-account-avatar" aria-hidden="true">{userProfile.initials}</span>
            <span className="topbar-account-name">{userProfile.shortName}</span>
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
          className={`a11y-button ${isWidgetOpen ? 'active' : ''}`}
          onClick={handleAccessibilityClick}
          aria-expanded={isWidgetOpen}
          aria-haspopup="dialog"
          aria-controls="a11y-widget-panel"
          aria-label={isWidgetOpen ? 'Tutup panel aksesibilitas' : 'Buka panel aksesibilitas'}
          title="Pengaturan Aksesibilitas"
        >
          <Icon name="access" />
          <span>Aksesibilitas</span>
        </button>
      </div>
    </header>
  );
}
