'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { Icon } from '@/components/ui/Icon';

const HOVER_DELAY_MS = 300;

export function VoiceReaderManager() {
  const { settings, setVoiceMode } = useAccessibility();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string>('');

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenElementRef = useRef<HTMLElement | null>(null);
  const lastSpokenTextRef = useRef<string>('');

  // Load available speech synthesis voices with fallback
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    function updateVoices() {
      try {
        voicesRef.current = window.speechSynthesis.getVoices() || [];
      } catch {
        voicesRef.current = [];
      }
    }

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const clean = text.trim();
    if (!clean) return;

    // Cancel any ongoing speech to prevent queue build-up
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Prefer Indonesian voice
    const indonesianVoice = voicesRef.current.find(
      (v) => v.lang === 'id-ID' || v.lang.startsWith('id')
    );
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
      utterance.lang = 'id-ID';
    } else {
      utterance.lang = 'id-ID';
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentText(clean.length > 55 ? `${clean.slice(0, 55)}...` : clean);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentText('');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentText('');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentText('');
  }, []);

  // Helper 1: Identify the nearest readable element with semantic priority and generic text fallback
  const getReadableElement = useCallback((target: HTMLElement | null): HTMLElement | null => {
    if (!target) return null;

    // Hard exclusions: Leaflet internal tiles/panes, internal voice controls, a11y widget, scripts, styles
    if (
      target.closest(
        '.leaflet-tile, .leaflet-pane, .leaflet-control-zoom, .leaflet-control-attribution, .voice-reader-bar, .a11y-widget-wrapper, script, style, noscript, [aria-hidden="true"]'
      )
    ) {
      return null;
    }

    // Special: Naviable Map Markers
    const marker = target.closest('.marker, .custom-leaflet-pin, [data-marker="true"]') as HTMLElement | null;
    if (marker) return marker;

    // 1. Semantic clickable & interactive controls first
    const interactive = target.closest(
      'button, a, input, textarea, select, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="radio"]'
    ) as HTMLElement | null;
    if (interactive) return interactive;

    // 2. Semantic text & heading elements
    const semantic = target.closest(
      'h1, h2, h3, h4, h5, h6, label, p, li, td, th, [role="heading"], [data-voice-label], [data-voice-readable]'
    ) as HTMLElement | null;
    if (semantic) return semantic;

    // 3. Fallback for generic text containers (span, div, small, strong, em, dt, dd)
    let curr: HTMLElement | null = target;
    let depth = 0;
    while (curr && depth < 3) {
      if (curr.matches('body, html, main, #__next, .app-shell, .workspace, .page, .leaflet-container')) {
        break;
      }
      const rawText = curr.innerText?.trim() || curr.textContent?.trim() || '';
      // Guard: visible, non-empty, reasonable length <= 300 chars, not a massive layout wrapper
      const isVisible = curr.offsetParent !== null || curr.getClientRects().length > 0;
      const childElements = curr.children.length;
      if (isVisible && rawText.length > 0 && rawText.length <= 300 && childElements <= 3) {
        return curr;
      }
      curr = curr.parentElement;
      depth++;
    }

    return null;
  }, []);

  // Helper 2: Extract formatted accessible text for speech synthesis
  const getReadableText = useCallback((element: HTMLElement): string | null => {
    // 1. Custom voice override label
    const customVoiceLabel = element.getAttribute('data-voice-label');
    if (customVoiceLabel?.trim()) return customVoiceLabel.trim();

    // 2. Naviable Map Marker handling
    if (
      element.matches('.marker, .custom-leaflet-pin, [data-marker="true"]') ||
      element.closest('.marker, .custom-leaflet-pin')
    ) {
      const placeTitle = element.getAttribute('title') || element.getAttribute('aria-label');
      if (placeTitle) return `${placeTitle}, penanda lokasi di peta`;
      const inner = element.innerText?.trim();
      if (inner) return `${inner}, penanda lokasi di peta`;
      return 'Penanda tempat di peta';
    }

    // 3. Alt text for meaningful images
    if (element.tagName.toLowerCase() === 'img') {
      const alt = element.getAttribute('alt');
      if (alt && alt.trim()) return `${alt.trim()}, gambar`;
      return null;
    }
    const innerImg = element.querySelector('img');
    if (innerImg && !element.innerText?.trim()) {
      const alt = innerImg.getAttribute('alt');
      if (alt && alt.trim()) return `${alt.trim()}, gambar`;
    }

    // 4. Form Controls & Inputs
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');

    // ARIA label / title priority
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    const title = element.getAttribute('title')?.trim();
    const cleanText = (
      ariaLabel ||
      title ||
      element.innerText?.trim() ||
      element.textContent?.trim() ||
      ''
    ).replace(/\s+/g, ' ');

    if (tagName === 'button' || role === 'button') {
      const isSwitch = role === 'switch' || element.hasAttribute('aria-checked');
      if (isSwitch) {
        const isChecked = element.getAttribute('aria-checked') === 'true';
        const label = cleanText || 'Pengaturan';
        return `${label}, ${isChecked ? 'aktif' : 'nonaktif'}`;
      }
      if (!cleanText) return 'Tombol';
      return `${cleanText}, tombol`;
    }

    if (tagName === 'a' || role === 'link') {
      if (!cleanText) return 'Tautan';
      return `${cleanText}, tautan`;
    }

    if (tagName === 'input') {
      const inputEl = element as HTMLInputElement;
      const type = inputEl.type;
      const label = ariaLabel || title || inputEl.placeholder || '';
      if (type === 'checkbox' || type === 'radio') {
        return `${label || 'Pilihan'}, ${inputEl.checked ? 'dicentang' : 'tidak dicentang'}`;
      }
      return `${label || 'Input'}, kolom teks`;
    }

    if (tagName === 'textarea') {
      const textareaEl = element as HTMLTextAreaElement;
      const label = ariaLabel || title || textareaEl.placeholder || '';
      return `${label || 'Input teks panjang'}, area teks`;
    }

    if (tagName === 'select') {
      const label = ariaLabel || title || '';
      return `${label || 'Pilihan formulir'}, pilihan`;
    }

    // 5. Headings
    if (/^h[1-6]$/.test(tagName) || role === 'heading') {
      if (!cleanText) return null;
      return `${cleanText}, judul`;
    }

    // 6. Regular text: paragraphs, list items, labels, generic span/div
    if (cleanText.length > 0 && cleanText.length <= 300) {
      return cleanText;
    }

    return null;
  }, []);

  // Main Event Delegation Effect
  useEffect(() => {
    if (!settings.voiceMode) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      lastSpokenElementRef.current = null;
      lastSpokenTextRef.current = '';
      return;
    }

    // Initial greeting feedback
    speak('Mode suara aktif.');

    // 1. Pointer Enter with Debounce
    function handlePointerOver(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const readableEl = getReadableElement(target);

      // If moving inside the same readable element, do nothing
      if (readableEl && readableEl === lastSpokenElementRef.current) {
        return;
      }

      // Clear any pending hover timer
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      if (!readableEl) return;

      // Start 300ms hover timer
      hoverTimerRef.current = setTimeout(() => {
        const text = getReadableText(readableEl);
        if (text && text !== lastSpokenTextRef.current) {
          lastSpokenElementRef.current = readableEl;
          lastSpokenTextRef.current = text;
          speak(text);
        }
      }, HOVER_DELAY_MS);
    }

    // 2. Pointer Leave: cancel pending speech if pointer leaves before 300ms
    function handlePointerOut(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      const related = e.relatedTarget as HTMLElement | null;

      const currentReadable = getReadableElement(target);

      // If moving to a child of the same element, keep timer
      if (currentReadable && related && currentReadable.contains(related)) {
        return;
      }

      // Pointer left the element before debounce expired
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }

    // 3. Keyboard Focusin (Immediate narration)
    function handleFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      const readableEl = getReadableElement(target);
      if (readableEl) {
        const text = getReadableText(readableEl);
        if (text && text !== lastSpokenTextRef.current) {
          lastSpokenElementRef.current = readableEl;
          lastSpokenTextRef.current = text;
          speak(text);
        }
      }
    }

    document.addEventListener('pointerover', handlePointerOver, { capture: true });
    document.addEventListener('pointerout', handlePointerOut, { capture: true });
    document.addEventListener('focusin', handleFocusIn, { capture: true });

    return () => {
      document.removeEventListener('pointerover', handlePointerOver, { capture: true });
      document.removeEventListener('pointerout', handlePointerOut, { capture: true });
      document.removeEventListener('focusin', handleFocusIn, { capture: true });

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      lastSpokenElementRef.current = null;
      lastSpokenTextRef.current = '';

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [settings.voiceMode, speak, getReadableElement, getReadableText]);

  if (!settings.voiceMode) return null;

  return (
    <div
      className="voice-reader-bar"
      role="region"
      aria-label="Kontrol Pembaca Suara"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1060,
        background: 'var(--surface, #ffffff)',
        color: 'var(--ink, #15213a)',
        border: '1.5px solid var(--purple, #6d45cc)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        borderRadius: '24px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '12px',
        fontWeight: 600,
        maxWidth: '90vw',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: isSpeaking ? 'var(--purple, #6d45cc)' : 'inherit',
        }}
      >
        <Icon name="volume" size={16} />
        <span style={{ whiteSpace: 'nowrap' }}>
          {isSpeaking ? currentText || 'Sedang membaca...' : 'Mode Suara Aktif'}
        </span>
      </span>

      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          style={{
            background: 'var(--purple-100, #f3e8ff)',
            color: 'var(--purple, #6d45cc)',
            border: '1px solid var(--purple, #6d45cc)',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
          aria-label="Hentikan pembacaan suara saat ini"
        >
          Hentikan
        </button>
      )}

      <button
        type="button"
        onClick={() => setVoiceMode(false)}
        style={{
          background: 'transparent',
          color: 'var(--muted, #64748b)',
          border: 0,
          padding: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Matikan Mode Suara"
        aria-label="Matikan Mode Suara"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
