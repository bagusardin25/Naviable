'use client';

import React, { useEffect, useRef } from 'react';
import { AccessibilitySettings } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { AccessibleToggle } from '@/components/ui/AccessibleToggle';

type AccessibilityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onToggleDarkMode: () => void;
  onToggleContrast: () => void;
  onToggleLargeText: () => void;
  onToggleReduceMotion: () => void;
  onToggleDyslexia: () => void;
  onReset: () => void;
};

export function AccessibilityModal({
  isOpen,
  onClose,
  settings,
  onToggleDarkMode,
  onToggleContrast,
  onToggleLargeText,
  onToggleReduceMotion,
  onToggleDyslexia,
  onReset,
}: AccessibilityModalProps) {
  const modalRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => {
        const closeBtn = document.getElementById('modal-close-btn');
        closeBtn?.focus();
      }, 50);
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={modalRef}
        className="a11y-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Preferensi Tampilan</span>
            <h2 id="a11y-title">Pengaturan Aksesibilitas</h2>
            <p>Atur tampilan agar paling nyaman dan pas dengan kebutuhan Anda.</p>
          </div>
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan aksesibilitas"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="settings-list">
          <AccessibleToggle
            id="toggle-dark-mode"
            label="Mode Gelap"
            text="Tampilkan tema bernuansa gelap yang lebih nyaman di mata saat pencahayaan redup."
            checked={settings.darkMode}
            onChange={onToggleDarkMode}
          />
          <AccessibleToggle
            id="toggle-contrast"
            label="Mode Kontras Tinggi"
            text="Tampilkan kontras batas dan teks maksimal agar elemen antarmuka terbaca jelas."
            checked={settings.contrast}
            onChange={onToggleContrast}
          />
          <AccessibleToggle
            id="toggle-large-text"
            label="Perbesar Ukuran Teks"
            text="Perbesar ukuran huruf di seluruh halaman agar lebih nyaman dibaca tanpa merusak tata letak."
            checked={settings.largeText}
            onChange={onToggleLargeText}
          />
          <AccessibleToggle
            id="toggle-reduce-motion"
            label="Kurangi Gerakan & Animasi"
            text="Nonaktifkan efek gerak dan animasi bila Anda sensitif terhadap perpindahan visual di layar."
            checked={settings.reduceMotion}
            onChange={onToggleReduceMotion}
          />
          <AccessibleToggle
            id="toggle-dyslexia"
            label="Huruf Ramah Disleksia"
            text="Gunakan jenis huruf dan spasi khusus yang lebih ramah bagi pembaca disleksia."
            checked={settings.dyslexia}
            onChange={onToggleDyslexia}
          />
        </div>

        <div className="modal-footer">
          <button
            id="btn-a11y-reset"
            type="button"
            className="secondary-action"
            onClick={onReset}
          >
            Kembalikan ke Awal
          </button>
          <button
            id="btn-a11y-save"
            type="button"
            className="primary-action"
            onClick={onClose}
          >
            Simpan
          </button>
        </div>
      </section>
    </div>
  );
}
