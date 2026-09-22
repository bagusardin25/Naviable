'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import type { AccessibilityWidgetPosition } from '@/types';

export function AccessibilityWidget() {
  const pathname = usePathname() || '';
  const isJelajahPage = pathname === '/jelajah' || pathname.startsWith('/jelajah');
  const isLoginPage = pathname === '/login';
  const { t } = useTranslation();

  const POSITION_OPTIONS: { id: AccessibilityWidgetPosition; label: string }[] = [
    { id: 'left', label: t('a11yWidget.posLeft') },
    { id: 'right', label: t('a11yWidget.posRight') },
  ];

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
  const [isCompact, setIsCompact] = useState(false);

  // Auto-collapse launcher to icon-only when scrolling near bottom
  useEffect(() => {
    if (isJelajahPage) {
      const timer = setTimeout(() => setIsCompact(false), 0);
      return () => clearTimeout(timer);
    }

    const footer = document.querySelector('footer');
    if (footer && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 80;
          setIsCompact(entry.isIntersecting && isScrollable);
        },
        {
          rootMargin: '0px 0px 40px 0px',
          threshold: 0,
        }
      );
      observer.observe(footer);
      return () => observer.disconnect();
    }

    let ticking = false;
    const checkScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const windowHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          const isScrollable = docHeight > windowHeight + 80;
          const nearBottom = isScrollable && scrollY + windowHeight >= docHeight - 160;
          setIsCompact(nearBottom);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, [isJelajahPage, pathname]);

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
    if (!isWidgetOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Simple focus trap within panel
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isWidgetOpen, handleClose]);

  // Close when clicking outside panel
  useEffect(() => {
    if (!isWidgetOpen) return;

    function handleClickOutside(e: MouseEvent) {
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
      aria-label={t('a11yWidget.regionAria')}
    >
      {/* Floating Trigger Button (only shown when not on jelajah/dashboard) */}
      {!isJelajahPage && (
        <button
          ref={triggerRef}
          id="a11y-widget-trigger"
          type="button"
          className={`a11y-widget-btn ${isWidgetOpen ? 'active' : ''} ${
            isCompact ? 'is-compact' : ''
          } ${activeFeaturesCount > 0 ? 'has-active-features' : ''}`}
          onClick={toggleWidget}
          aria-expanded={isWidgetOpen}
          aria-haspopup="dialog"
          aria-controls="a11y-widget-panel"
          aria-label={t('a11yWidget.triggerBtnAria')} /* aria-label="Buka pengaturan aksesibilitas" */
          title={t('a11yWidget.triggerBtnTitle')}
        >
          <span className="a11y-widget-icon-wrapper" aria-hidden="true">
            <Icon name="access" size={20} />
          </span>
          <span className="a11y-widget-label">{t('a11yWidget.triggerBtnLabel')}</span>
          {activeFeaturesCount > 0 && (
            <span className="a11y-active-badge" aria-label={t('a11yWidget.activeFeaturesBadge', { count: activeFeaturesCount })}>
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
                <h2 id="a11y-panel-title">{t('a11yWidget.panelTitle')}</h2>
                <p>{t('a11yWidget.panelSubtitle')}</p>
              </div>
            </div>
            <button
              type="button"
              className="a11y-panel-close-btn"
              onClick={handleClose}
              title={t('a11yWidget.closeBtnTitle')}
              aria-label={t('a11yWidget.closeBtnAria')}
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="a11y-panel-body">
            {/* Accessibility Features Grid */}
            <div className="a11y-section">
              <span className="a11y-section-title">
                <Icon name="sparkles" size={14} />
                <span>{t('a11yWidget.sectionFeatures')}</span>{/* <span>Fitur Aksesibilitas</span> */}
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
                  <strong className="feature-card-name">{t('a11yWidget.motorCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.motorCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.dyslexiaCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.dyslexiaCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.textSizeCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.textSizeCardDesc')}
                  </span>

                  {/* Stepper Control: [ Zoom Out ] 120% [ Zoom In ] */}
                  <div className="a11y-text-stepper" role="group" aria-label={t('a11yWidget.textSizeAria')}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextScale(Math.max(100, settings.textScale - 10));
                      }}
                      disabled={settings.textScale <= 100}
                      aria-label={t('a11yWidget.decreaseTextSize')}
                      title={t('a11yWidget.decreaseTextSize')}
                      className="a11y-stepper-btn"
                    >
                      <Icon name="zoom-out" size={17} />
                    </button>

                    <div className="a11y-stepper-value-wrap">
                      <span className="a11y-stepper-value" aria-live="polite">
                        {settings.textScale}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextScale(Math.min(200, settings.textScale + 10));
                      }}
                      disabled={settings.textScale >= 200}
                      aria-label={t('a11yWidget.increaseTextSize')}
                      title={t('a11yWidget.increaseTextSize')}
                      className="a11y-stepper-btn"
                    >
                      <Icon name="zoom-in" size={17} />
                    </button>
                  </div>

                  <div className="a11y-stepper-track" aria-hidden="true">
                    <div
                      className="a11y-stepper-bar"
                      style={{ width: `${((settings.textScale - 100) / 100) * 100}%` }}
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
                  <strong className="feature-card-name">{t('a11yWidget.contrastCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.contrastCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.colorBlindCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.colorBlindCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.highlightCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.highlightCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.readingGuideCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.readingGuideCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.voiceModeCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.voiceModeCardDesc')}
                  </span>
                </button>
              </div>
            </div>

            {/* Display and motion options use the same feature-card pattern */}
            <div className="a11y-section a11y-section-separated">
              <span className="a11y-section-title">
                <Icon name="eye" size={14} />
                <span>{t('a11yWidget.sectionDisplayMotion')}</span>{/* <span>Tampilan &amp; Gerakan</span> */}
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
                  <strong className="feature-card-name">{t('a11yWidget.darkModeCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.darkModeCardDesc')}
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
                  <strong className="feature-card-name">{t('a11yWidget.reduceMotionCardName')}</strong>
                  <span className="feature-card-desc">
                    {t('a11yWidget.reduceMotionCardDesc')}
                  </span>
                </button>
              </div>
            </div>

            {/* Widget position stays immediately above the reset footer */}
            {!isJelajahPage && (
              <div className="a11y-section a11y-section-separated a11y-position-section">
                <span className="a11y-section-title">
                  <Icon name="move" size={14} />
                  <span>{t('a11yWidget.sectionPosition')}</span>{/* <span>Posisi Widget</span> */}
                </span>
                <div
                  className="a11y-position-grid"
                  role="radiogroup"
                  aria-label={t('a11yWidget.positionRadioGroupAria')}
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
              title={t('a11yWidget.resetBtnTitle')}
            >
              <Icon name="refresh" size={15} />
              <span>{t('a11yWidget.resetBtnLabel')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
