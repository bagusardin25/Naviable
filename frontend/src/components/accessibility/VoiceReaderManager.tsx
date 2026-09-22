'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { getSpeechLanguage, selectVoiceForLocale } from '@/lib/voice-reader';

const HOVER_DELAY_MS = 300;

export function VoiceReaderManager() {
  const { settings, setVoiceMode } = useAccessibility();
  const { t, locale } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string>('');

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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

    // Cancel any ongoing speech to prevent queue build-up.
    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Prefer voice according to active locale
    const preferredVoice = selectVoiceForLocale(voicesRef.current, locale);
    utterance.lang = getSpeechLanguage(locale);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    }

    activeUtteranceRef.current = utterance;

    utterance.onstart = () => {
      if (activeUtteranceRef.current !== utterance) return;
      setIsSpeaking(true);
      setCurrentText(clean.length > 55 ? `${clean.slice(0, 55)}...` : clean);
    };

    utterance.onend = () => {
      if (activeUtteranceRef.current !== utterance) return;
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
      setCurrentText('');
    };

    utterance.onerror = () => {
      if (activeUtteranceRef.current !== utterance) return;
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
      setCurrentText('');
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      activeUtteranceRef.current = null;
      setIsSpeaking(false);
      setCurrentText('');
    }
  }, [locale]);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    activeUtteranceRef.current = null;
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
      if (placeTitle) return `${placeTitle}, ${t('voiceReader.mapMarker')}`;
      const inner = element.innerText?.trim();
      if (inner) return `${inner}, ${t('voiceReader.mapMarker')}`;
      return t('voiceReader.mapMarker');
    }

    // 3. Alt text for meaningful images
    if (element.tagName.toLowerCase() === 'img') {
      const alt = element.getAttribute('alt');
      if (alt && alt.trim()) return `${alt.trim()}, ${t('voiceReader.image')}`;
      return null;
    }
    const innerImg = element.querySelector('img');
    if (innerImg && !element.innerText?.trim()) {
      const alt = innerImg.getAttribute('alt');
      if (alt && alt.trim()) return `${alt.trim()}, ${t('voiceReader.image')}`;
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

    if (tagName === 'button' || role === 'button' || role === 'tab' || role === 'switch') {
      const isSwitch = role === 'switch' || element.hasAttribute('aria-checked');
      if (isSwitch) {
        const isChecked = element.getAttribute('aria-checked') === 'true';
        const label = cleanText || (locale === 'en' ? 'Setting' : 'Pengaturan');
        return `${label}, ${isChecked ? t('voiceReader.active') : t('voiceReader.inactive')}`;
      }
      if (!cleanText) return t('voiceReader.button');
      return `${cleanText}, ${t('voiceReader.button')}`;
    }

    if (tagName === 'a' || role === 'link') {
      if (!cleanText) return t('voiceReader.link');
      return `${cleanText}, ${t('voiceReader.link')}`;
    }

    if (tagName === 'input') {
      const inputEl = element as HTMLInputElement;
      const type = inputEl.type;
      const label = ariaLabel || title || inputEl.placeholder || '';
      if (type === 'checkbox' || type === 'radio') {
        return `${label || (locale === 'en' ? 'Option' : 'Pilihan')}, ${inputEl.checked ? t('voiceReader.checked') : t('voiceReader.unchecked')}`;
      }
      return label ? `${label}, ${t('voiceReader.input')}` : t('voiceReader.input');
    }

    if (tagName === 'textarea') {
      const textareaEl = element as HTMLTextAreaElement;
      const label = ariaLabel || title || textareaEl.placeholder || '';
      return label ? `${label}, ${t('voiceReader.textarea')}` : t('voiceReader.textarea');
    }

    if (tagName === 'select') {
      const label = ariaLabel || title || '';
      return label ? `${label}, ${t('voiceReader.select')}` : t('voiceReader.select');
    }

    // 5. Headings
    if (/^h[1-6]$/.test(tagName) || role === 'heading') {
      if (!cleanText) return null;
      return `${cleanText}, ${t('voiceReader.heading')}`;
    }

    // 6. Regular text: paragraphs, list items, labels, generic span/div
    if (cleanText.length > 0 && cleanText.length <= 300) {
      return cleanText;
    }

    return null;
  }, [locale, t]);

  // Main Event Delegation Effect
  useEffect(() => {
    if (!settings.voiceMode) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        activeUtteranceRef.current = null;
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

    // Initial greeting feedback after listeners are ready; the timer is cleaned up
    // when voice mode or locale changes.
    const greetingTimer = window.setTimeout(() => {
      speak(t('voiceReader.modeActive'));
    }, 0);

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
      window.clearTimeout(greetingTimer);
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
        activeUtteranceRef.current = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [settings.voiceMode, speak, getReadableElement, getReadableText, t]);

  if (!settings.voiceMode) return null;

  return (
    <div
      className="voice-reader-bar"
      role="region"
      aria-label={t('voiceReader.regionAria')}
      style={{
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
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: isSpeaking ? 'var(--purple, #6d45cc)' : 'inherit',
          minWidth: 0,
        }}
      >
        <Icon name="volume" size={16} />
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 'min(240px, 45vw)',
          }}
        >
          {isSpeaking ? currentText || t('voiceReader.readingStatus') : t('voiceReader.modeActive')}
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
          aria-label={t('voiceReader.stopSpeech')}
        >
          {t('voiceReader.stopSpeech')}
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
        title={t('voiceReader.turnOffVoiceMode')}
        aria-label={t('voiceReader.turnOffVoiceMode')}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
