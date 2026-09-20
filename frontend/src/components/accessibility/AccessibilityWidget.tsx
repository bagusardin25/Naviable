'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Icon } from '@/components/ui/Icon';
import type { AccessibilityWidgetPosition } from '@/types';

const POSITION_OPTIONS: { id: AccessibilityWidgetPosition; label: string }[] = [
  { id: 'left', label: 'Kiri' },
  { id: 'right', label: 'Kanan' },
];

export function AccessibilityWidget() {
  const pathname = usePathname() || '';
  const isJelajahPage = pathname === '/jelajah' || pathname.startsWith('/jelajah');
  const isLoginPage = pathname === '/login';

  const {
    settings,
    isWidgetOpen,
    closeWidget,
    toggleWidget,
    setDarkMode,
    setContrast,
    setTextScale,
    setReduceMotion,
    setDyslexia,
    setMotorMode,
    setColorBlind,
    setHighlightInteractive,
    setReadingGuide,
    setVoiceMode,
    setWidgetPosition,
    resetSettings,
  } = useAccessibility();

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    closeWidget();
    if (isJelajahPage) {
      document.getElementById('btn-accessibility')?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [closeWidget, isJelajahPage]);

  // Focus trap & Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isWidgetOpen) return;
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWidgetOpen, handleClose]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!isWidgetOpen) return;
      const target = e.target as Node;
      const navbarBtn = document.getElementById('btn-accessibility');
      if (navbarBtn && navbarBtn.contains(target)) {
        return;
      }
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        (!triggerRef.current || !triggerRef.current.contains(target))
      ) {
        closeWidget();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isWidgetOpen, closeWidget]);

  // If on jelajah/dashboard page and widget is not open, nothing to render
  if (isJelajahPage && !isWidgetOpen) {
    return null;
  }

  // Active features count for badge
  const activeFeaturesCount = [
    settings.motorMode,
    settings.dyslexia,
    settings.textScale > 100,
    settings.contrast,
    settings.colorBlind,
    settings.highlightInteractive,
    settings.readingGuide,
    settings.voiceMode,
    settings.darkMode,
    settings.reduceMotion,
  ].filter(Boolean).length;

  const currentPos: AccessibilityWidgetPosition = settings.widgetPosition === 'left' ? 'left' : 'right';
  const wrapperClass = isJelajahPage
    ? 'a11y-widget-wrapper widget-pos-navbar-anchored'
    : `a11y-widget-wrapper widget-pos-${currentPos}${isLoginPage ? ' widget-page-login' : ''}`;

  return (
    <div
      className={wrapperClass}
      role="region"
      aria-label="Fitur Aksesibilitas"
    >
      {/* Floating Trigger Button (only shown when not on jelajah/dashboard) */}
      {!isJelajahPage && (
        <button
          ref={triggerRef}
          id="a11y-widget-trigger"
          type="button"
          className={`a11y-widget-btn ${isWidgetOpen ? 'active' : ''} ${
            activeFeaturesCount > 0 ? 'has-active-features' : ''
          }`}
          onClick={toggleWidget}
          aria-expanded={isWidgetOpen}
          aria-haspopup="dialog"
          aria-controls="a11y-widget-panel"
          title="Pengaturan Aksesibilitas"
        >
          <span className="a11y-widget-icon-wrapper" aria-hidden="true">
            <Icon name="access" size={20} />
          </span>
          <span className="a11y-widget-label">Aksesibilitas</span>
          {activeFeaturesCount > 0 && (
            <span className="a11y-active-badge" aria-label={`${activeFeaturesCount} fitur aktif`}>
              {activeFeaturesCount}
            </span>
          )}
        </button>
      )}

      {/* Accessibility Panel Dialog */}
      {isWidgetOpen && (
        <div
          ref={panelRef}
          id="a11y-widget-panel"
          className="a11y-widget-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-panel-title"
        >
          {/* Header */}
          <div className="a11y-panel-header">
            <div className="a11y-panel-header-title">
              <div className="a11y-panel-icon" aria-hidden="true">
                <Icon name="access" size={18} />
              </div>
              <div>
                <h2 id="a11y-panel-title">Aksesibilitas</h2>
                <p>Sesuaikan tampilan dan interaksi dengan kebutuhan Anda.</p>
              </div>
            </div>
            <button
              type="button"
              className="a11y-panel-close-btn"
              onClick={handleClose}
              title="Tutup panel aksesibilitas"
              aria-label="Tutup panel aksesibilitas"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="a11y-panel-body">
            {/* Accessibility Features Grid */}
            <div className="a11y-section">
              <span className="a11y-section-title">
                <Icon name="sparkles" size={14} />
                <span>Fitur Aksesibilitas</span>
              </span>
              <div className="a11y-feature-grid">
                {/* 1. Gangguan Motorik */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.motorMode}
                  className={`a11y-feature-card ${settings.motorMode ? 'active' : ''}`}
                  onClick={() => setMotorMode(!settings.motorMode)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="motor" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.motorMode ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Gangguan Motorik</strong>
                  <span className="feature-card-desc">
                    Perbesar area sentuh & ruang tombol untuk navigasi yang lebih mudah.
                  </span>
                </button>

                {/* 2. Dyslexia */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.dyslexia}
                  className={`a11y-feature-card ${settings.dyslexia ? 'active' : ''}`}
                  onClick={() => setDyslexia(!settings.dyslexia)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="type" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.dyslexia ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Huruf Ramah Disleksia</strong>
                  <span className="feature-card-desc">
                    Gunakan OpenDyslexic dan spasi alternatif yang lebih ramah dibaca.
                  </span>
                </button>

                {/* 3. Ukuran Teks (Custom Text Scale 100% - 200%) */}
                <div
                  className={`a11y-feature-card ${settings.textScale > 100 ? 'active' : ''}`}
                  style={{ cursor: 'default' }}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="text" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.textScale > 100 ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Ukuran Teks</strong>
                  <span className="feature-card-desc">
                    Sesuaikan skala teks dari 100% hingga 200% sesuai kebutuhan.
                  </span>

                  {/* Stepper + Slider Control */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      width: '100%',
                      marginTop: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTextScale(Math.max(100, settings.textScale - 10));
                        }}
                        disabled={settings.textScale <= 100}
                        aria-label="Perkecil ukuran teks"
                        title="Perkecil ukuran teks"
                        style={{
                          width: '34px',
                          height: '34px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-secondary)',
                          color: 'var(--ink)',
                          fontSize: '18px',
                          fontWeight: 700,
                          cursor: settings.textScale <= 100 ? 'not-allowed' : 'pointer',
                          opacity: settings.textScale <= 100 ? 0.4 : 1,
                        }}
                      >
                        -
                      </button>

                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 750,
                          color: settings.textScale > 100 ? 'var(--purple)' : 'var(--ink)',
                          minWidth: '54px',
                          textAlign: 'center',
                        }}
                        aria-live="polite"
                      >
                        {settings.textScale}%
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTextScale(Math.min(200, settings.textScale + 10));
                        }}
                        disabled={settings.textScale >= 200}
                        aria-label="Perbesar ukuran teks"
                        title="Perbesar ukuran teks"
                        style={{
                          width: '34px',
                          height: '34px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-secondary)',
                          color: 'var(--ink)',
                          fontSize: '18px',
                          fontWeight: 700,
                          cursor: settings.textScale >= 200 ? 'not-allowed' : 'pointer',
                          opacity: settings.textScale >= 200 ? 0.4 : 1,
                        }}
                      >
                        +
                      </button>
                    </div>

                    <input
                      type="range"
                      min="100"
                      max="200"
                      step="10"
                      value={settings.textScale}
                      onChange={(e) => setTextScale(Number(e.target.value))}
                      aria-label="Ukuran teks"
                      aria-valuemin={100}
                      aria-valuemax={200}
                      aria-valuenow={settings.textScale}
                      aria-valuetext={`${settings.textScale}%`}
                      style={{
                        width: '100%',
                        accentColor: 'var(--purple)',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>

                {/* 4. Kontras Tinggi */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.contrast}
                  className={`a11y-feature-card ${settings.contrast ? 'active' : ''}`}
                  onClick={() => setContrast(!settings.contrast)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="contrast" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.contrast ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Kontras Tinggi</strong>
                  <span className="feature-card-desc">
                    Tingkatkan ketegasan batas dan kontras teks agar terbaca jelas.
                  </span>
                </button>

                {/* 5. Buta Warna */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.colorBlind}
                  className={`a11y-feature-card ${settings.colorBlind ? 'active' : ''}`}
                  onClick={() => setColorBlind(!settings.colorBlind)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="palette" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.colorBlind ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Buta Warna</strong>
                  <span className="feature-card-desc">
                    Ubah seluruh tampilan situs menjadi hitam putih.
                  </span>
                </button>

                {/* 6. Highlight Interaktif */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.highlightInteractive}
                  className={`a11y-feature-card ${settings.highlightInteractive ? 'active' : ''}`}
                  onClick={() => setHighlightInteractive(!settings.highlightInteractive)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="link" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.highlightInteractive ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Highlight Tautan & Tombol</strong>
                  <span className="feature-card-desc">
                    Beri garis bawah tegas pada tautan serta bingkai pada tombol dan aksi.
                  </span>
                </button>

                {/* 7. Panduan Baca */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.readingGuide}
                  className={`a11y-feature-card ${settings.readingGuide ? 'active' : ''}`}
                  onClick={() => setReadingGuide(!settings.readingGuide)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="reading-guide" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.readingGuide ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Panduan Baca</strong>
                  <span className="feature-card-desc">
                    Tampilkan garis bantu horizontal mengikuti arah kursor baca.
                  </span>
                </button>

                {/* 8. Mode Suara */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.voiceMode}
                  className={`a11y-feature-card ${settings.voiceMode ? 'active' : ''}`}
                  onClick={() => setVoiceMode(!settings.voiceMode)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="volume" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.voiceMode ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Mode Suara</strong>
                  <span className="feature-card-desc">
                    Arahkan kursor atau gunakan tombol Tab untuk mendengarkan teks elemen.
                  </span>
                </button>
              </div>
            </div>

            {/* Display and motion options use the same feature-card pattern */}
            <div className="a11y-section a11y-section-separated">
              <span className="a11y-section-title">
                <Icon name="eye" size={14} />
                <span>Tampilan &amp; Gerakan</span>
              </span>
              <div className="a11y-feature-grid">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.darkMode}
                  className={`a11y-feature-card ${settings.darkMode ? 'active' : ''}`}
                  onClick={() => setDarkMode(!settings.darkMode)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="dark-mode" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.darkMode ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Mode Gelap</strong>
                  <span className="feature-card-desc">
                    Gunakan palet gelap untuk mengurangi silau pada layar.
                  </span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.reduceMotion}
                  className={`a11y-feature-card ${settings.reduceMotion ? 'active' : ''}`}
                  onClick={() => setReduceMotion(!settings.reduceMotion)}
                >
                  <div className="feature-card-top">
                    <span className="feature-card-icon" aria-hidden="true">
                      <Icon name="reduce-motion" size={18} />
                    </span>
                    <span className={`feature-status-dot ${settings.reduceMotion ? 'on' : ''}`} />
                  </div>
                  <strong className="feature-card-name">Kurangi Gerakan</strong>
                  <span className="feature-card-desc">
                    Minimalkan animasi dan transisi yang tidak diperlukan.
                  </span>
                </button>
              </div>
            </div>

            {/* Widget position stays immediately above the reset footer */}
            {!isJelajahPage && (
              <div className="a11y-section a11y-section-separated a11y-position-section">
                <span className="a11y-section-title">
                  <Icon name="move" size={14} />
                  <span>Posisi Widget</span>
                </span>
                <div
                  className="a11y-position-grid"
                  role="radiogroup"
                  aria-label="Pilih posisi widget aksesibilitas"
                >
                  {POSITION_OPTIONS.map((option) => {
                    const isSelected = currentPos === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`a11y-pos-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setWidgetPosition(option.id)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Reset Button */}
          <div className="a11y-panel-footer">
            <button
              type="button"
              className="a11y-reset-btn"
              onClick={resetSettings}
              title="Kembalikan semua preferensi ke pengaturan awal"
            >
              <Icon name="refresh" size={15} />
              <span>Kembalikan ke Awal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
