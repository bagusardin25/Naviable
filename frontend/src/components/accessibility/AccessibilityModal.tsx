'use client';

import React, { useEffect, useRef } from 'react';
import { AccessibilitySettings } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { AccessibleToggle } from '@/components/ui/AccessibleToggle';

type AccessibilityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
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
            <h2 id="a11y-title">Accessibility Settings</h2>
            <p>Atur antarmuka Naviable agar paling nyaman dan aman sesuai kebutuhan indra Anda.</p>
          </div>
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela pengaturan aksesibilitas"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="settings-list">
          <AccessibleToggle
            id="toggle-contrast"
            label="High Contrast Dark Mode"
            text="Tingkatkan kontras antarelemen antarmuka dengan palet gelap pekat dan teks terang."
            checked={settings.contrast}
            onChange={onToggleContrast}
          />
          <AccessibleToggle
            id="toggle-large-text"
            label="Large Typography"
            text="Perbesar ukuran teks antarmuka secara global tanpa mengubah makna atau merusak tata letak."
            checked={settings.largeText}
            onChange={onToggleLargeText}
          />
          <AccessibleToggle
            id="toggle-reduce-motion"
            label="Disable Motion & Animations"
            text="Nonaktifkan transisi visual, efek pemindaian, dan animasi yang dapat memicu pusing."
            checked={settings.reduceMotion}
            onChange={onToggleReduceMotion}
          />
          <AccessibleToggle
            id="toggle-dyslexia"
            label="Dyslexia-Friendly Typography"
            text="Gunakan bentuk huruf yang lebih jelas dan jarak antarhuruf yang ramah untuk pembaca disleksia."
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
            Reset Standar
          </button>
          <button
            id="btn-a11y-save"
            type="button"
            className="primary-action"
            onClick={onClose}
          >
            Simpan Preferensi
          </button>
        </div>
      </section>
    </div>
  );
}
