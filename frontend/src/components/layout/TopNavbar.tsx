'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Icon } from '@/components/ui/Icon';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import type { Place } from '@/types';
import type { ExternalPlaceResult } from '@/lib/externalGeocoding';
import { matchesPlaceQuery } from '@/lib/streetSearch';

type TopNavbarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit?: (query: string, source: 'voice' | 'text') => void;
  onSearchFocus?: () => void;
  onOpenAccessibility?: () => void;
  localPlaces?: Place[];
  externalPlaces?: ExternalPlaceResult[];
  externalLoading?: boolean;
  onSelectLocalPlace?: (place: Place) => void;
  onSelectExternalPlace?: (ext: ExternalPlaceResult, action: 'view' | 'add') => void;
};

export function TopNavbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchFocus,
  onOpenAccessibility,
  localPlaces = [],
  externalPlaces = [],
  externalLoading = false,
  onSelectLocalPlace,
  onSelectExternalPlace,
}: TopNavbarProps) {
  const { t, locale } = useTranslation();
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
    lang: locale === 'id' ? 'id-ID' : 'en-US',
    onResult: (transcript) => {
      onSearchChange(transcript);
      onSearchSubmit?.(transcript, 'voice');
      showNotification(t('map.voiceSearching', { transcript }), 'success', 3000);
      setVoiceAnnouncement(t('map.voiceApplied', { transcript }));
    },
    onError: (err) => {
      showNotification(err, 'error', 4500);
      setVoiceAnnouncement(t('map.voiceError', { error: err }));
    },
  });

  const handleVoiceSearchClick = () => {
    if (isListening) {
      stopListening();
      setVoiceAnnouncement(t('map.voiceStopped'));
      return;
    }

    if (!isSupported) {
      showNotification(t('map.voiceNotSupported'), 'info', 4500);
      setVoiceAnnouncement(t('map.voiceNotSupported'));
      return;
    }

    setVoiceAnnouncement(t('map.voiceStartPrompt'));
    startListening();
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const localMatches = useMemo(() => {
    if (!localPlaces || !searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return localPlaces.filter((p) => matchesPlaceQuery(p, searchQuery).matched).slice(0, 3);
  }, [localPlaces, searchQuery]);

  const unrecordedExternal = useMemo(() => {
    if (!externalPlaces || !searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return externalPlaces.filter((ext) => !ext.isExistingInNaviable).slice(0, 4);
  }, [externalPlaces, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      if (isListening) {
        cancelListening();
        setVoiceAnnouncement('Pencarian suara dibatalkan.');
      }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsDropdownOpen(false);
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

      <Link href="/" className="topbar-mobile-brand" aria-label={t('nav.backToHome')} data-icon-only-link>
        <BrandLogo size={30} className="topbar-mobile-logo" />
      </Link>

      <div ref={searchContainerRef} className="search-container" onKeyDown={handleKeyDown}>
        <label className="search-box" htmlFor="search-input">
          <Icon name="search" />
          <input
            id="search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              onSearchFocus?.();
              if (searchQuery.trim().length >= 2) setIsDropdownOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={t('map.searchPlaceholder')}
            aria-label={t('map.searchAriaLabel')}
            autoComplete="off"
          />
          <button
            id="btn-search-voice"
            type="button"
            className={`search-voice-btn ${isListening ? 'listening' : ''}`}
            aria-label={
              isListening
                ? (locale === 'id' ? 'Sedang mendengarkan ucapan... Klik untuk selesai' : 'Listening... Click to finish')
                : t('map.voiceSearchTitle')
            }
            aria-pressed={isListening}
            onClick={handleVoiceSearchClick}
            title={isListening ? t('map.voiceSearchStop') : t('map.voiceSearchTitle')}
          >
            <Icon name="mic" size={18} />
            {isListening && <span className="voice-pulse-ring" aria-hidden="true" />}
          </button>
        </label>

        {/* Search Autocomplete Dropdown */}
        {isDropdownOpen && searchQuery.trim().length >= 2 && (localMatches.length > 0 || unrecordedExternal.length > 0 || externalLoading) && (
          <div className="search-autocomplete-dropdown" role="listbox" aria-label={t('map.searchAriaLabel')}>
            {localMatches.length > 0 && (
              <div className="autocomplete-section">
                <div className="autocomplete-section-title">
                  <Icon name="check-circle" size={13} />
                  <span>{t('map.registeredInNaviable')}</span>
                </div>
                {localMatches.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    className="autocomplete-item local-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSelectLocalPlace?.(place);
                    }}
                  >
                    <div className="autocomplete-item-main">
                      <span className="autocomplete-place-name">{place.name}</span>
                      <span className="autocomplete-place-sub">
                        {place.category} · {place.district}
                      </span>
                    </div>
                    <span className="autocomplete-pill-audited">{t('map.recordedPill')}</span>
                  </button>
                ))}
              </div>
            )}

            {externalLoading && (
              <div className="autocomplete-loading">
                <div className="map-spinner small" />
                <span>{t('map.searchingOsm')}</span>
              </div>
            )}

            {unrecordedExternal.length > 0 && (
              <div className="autocomplete-section external-section">
                <div className="autocomplete-section-title external-title">
                  <Icon name="map-pin" size={13} />
                  <span>{t('map.publicUnrecorded')}</span>
                </div>
                {unrecordedExternal.map((ext) => (
                  <div key={ext.id} className="autocomplete-item external-item">
                    <div className="autocomplete-item-main">
                      <div className="autocomplete-name-row">
                        <span className="autocomplete-place-name">{ext.name}</span>
                        <span className="autocomplete-badge-unrecorded">{t('map.unrecordedPill')}</span>
                      </div>
                      <span className="autocomplete-place-sub">{ext.address}</span>
                    </div>
                    <div className="autocomplete-item-actions">
                      <button
                        type="button"
                        className="autocomplete-btn-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDropdownOpen(false);
                          onSelectExternalPlace?.(ext, 'view');
                        }}
                        title={t('map.viewPoint')}
                      >
                        <Icon name="map-pin" size={13} />
                        <span>{t('map.viewPoint')}</span>
                      </button>
                      <button
                        type="button"
                        className="autocomplete-btn-add"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDropdownOpen(false);
                          onSelectExternalPlace?.(ext, 'add');
                        }}
                        title={t('map.addPoint')}
                      >
                        <Icon name="plus" size={13} />
                        <span>{t('map.addPoint')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="autocomplete-footer">
              <span>{t('map.pressEnterForFull')}</span>
            </div>
          </div>
        )}

        {/* Live region announcement for screen readers */}
        <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
          {voiceAnnouncement}
        </div>

        {/* Panel status suara saat aktif mendengarkan */}
        {isListening && (
          <div className="voice-search-card listening" role="region" aria-label={t('map.voiceStatusAria')}>
            <div className="voice-listening-content">
              <div className="voice-wave-indicator" aria-hidden="true">
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
              </div>
              <div className="voice-listening-info">
                <p className="voice-status-title">{t('map.voiceListening')}</p>
                <p className="voice-transcript-preview">
                  {interimTranscript ? `“${interimTranscript}”` : t('map.voiceMentionPrompt')}
                </p>
              </div>
              <div className="voice-card-actions">
                <button
                  type="button"
                  className="voice-cancel-btn"
                  onClick={cancelListening}
                  aria-label={t('map.voiceCancel')}
                  title={t('map.voiceCancel')}
                >
                  <Icon name="x" size={14} />
                  <span>{t('map.voiceCancel')}</span>
                </button>
                <button
                  type="button"
                  className="voice-done-btn"
                  onClick={stopListening}
                  aria-label={t('map.voiceDone')}
                  title={t('map.voiceDone')}
                >
                  <Icon name="check" size={14} />
                  <span>{t('map.voiceDone')}</span>
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
              aria-label={t('common.close')}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <LanguageSwitcher variant="compact" />
        <button
          id="btn-accessibility"
          type="button"
          className={`a11y-button ${isWidgetOpen ? 'active' : ''}`}
          onClick={handleAccessibilityClick}
          aria-expanded={isWidgetOpen}
          aria-haspopup="dialog"
          aria-controls="a11y-widget-panel"
          aria-label={isWidgetOpen ? t('a11yWidget.closeBtnAria') : t('a11yWidget.triggerBtnAria')}
          title={t('a11yWidget.triggerBtnTitle')}
        >
          <Icon name="access" />
          <span>{t('a11yWidget.triggerBtnLabel')}</span>
        </button>
      </div>
    </header>
  );
}
