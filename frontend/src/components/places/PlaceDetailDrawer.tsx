'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Place, placeStatusMeta, getEvidenceFreshness, detectConditionChanges, AccessibilityNeed } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AccessibilityChain } from './AccessibilityChain';
import { CorrectionHistory } from './CorrectionHistory';
import { PlaceReviews } from './PlaceReviews';
import { fetchPlaceReports, type ApiReport } from '@/lib/api';
import { buildGoogleMapsPlaceUrl } from '@/lib/externalMaps';
import { useTranslation } from '@/hooks/useTranslation';

type PlaceDetailDrawerProps = {
  place: Place | null;
  onClose: () => void;
  onCorrectPlace: (place: Place) => void;
  onWriteReview: (place: Place) => void;
  signedIn: boolean;
  activeNeed?: AccessibilityNeed;
};

export function PlaceDetailDrawer({
  place,
  onClose,
  onCorrectPlace,
  onWriteReview,
  signedIn,
  activeNeed = 'Mobilitas',
}: PlaceDetailDrawerProps) {
  const { t, formatDate } = useTranslation();
  const drawerRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus trap & focus restoration
  useEffect(() => {
    if (place) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      // Focus close button after drawer renders
      setTimeout(() => {
        const closeBtn = document.getElementById('drawer-close-btn');
        closeBtn?.focus();
      }, 50);
    }
    return () => {
      // Restore focus to previous trigger
      previouslyFocusedRef.current?.focus();
    };
  }, [place]);

  useEffect(() => {
    if (!place) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
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
  }, [onClose, place]);

  const placeId = place ? String(place.id) : null;
  const reportCount = place?.reportCount ?? 0;
  const [history, setHistory] = useState<{ key: string; error: boolean; reports: ApiReport[]; total: number } | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);

  // Loaded per place, and refreshed when a new report lands so a correction appears
  // immediately instead of only after a full page reload.
  useEffect(() => {
    if (placeId === null) return;
    let active = true;
    const key = `${placeId}:${reportCount}:${historyAttempt}`;
    fetchPlaceReports(placeId)
      .then((page) => {
        if (active) setHistory({ key, error: false, reports: page.reports, total: page.total });
      })
      .catch(() => {
        if (active) setHistory({ key, error: true, reports: [], total: 0 });
      });
    return () => {
      active = false;
    };
  }, [placeId, reportCount, historyAttempt]);

  const historyKey = `${placeId}:${reportCount}:${historyAttempt}`;
  const historySettled = history?.key === historyKey;
  const historyState: 'idle' | 'loading' | 'error' = !historySettled ? 'loading' : history.error ? 'error' : 'idle';

  if (!place) return null;

  const meta = placeStatusMeta(place, activeNeed);
  const freshness = getEvidenceFreshness(place.updatedAt);
  const conditionChanges = detectConditionChanges(historySettled ? history.reports : []);
  const unknownElements = place.elements.filter((element) => element.status === 'BELUM_DIKETAHUI').length;
  const googleMapsPlaceUrl =
    !place.needsGeocoding && place.lat !== null && place.lng !== null
      ? buildGoogleMapsPlaceUrl({ destination: place, travelMode: 'walking' })
      : null;

  const freshnessIcon =
    freshness.level === 'fresh'
      ? 'check-circle'
      : freshness.level === 'aging'
      ? 'clock'
      : freshness.level === 'stale'
      ? 'history'
      : 'info';

  const localizedFreshnessLabel = t(`freshness.${freshness.level}`) || freshness.label;
  const localizedNeed = t(`needs.${activeNeed}`) || activeNeed;

  return (
    <section
      ref={drawerRef}
      className="detail-drawer"
      aria-label={`${t('places.detailAria')} ${place.name}`}
      role="dialog"
      aria-modal="true"
    >
      <button
        id="drawer-close-btn"
        className="drawer-close"
        onClick={onClose}
        aria-label={t('places.closeDetail')}
        type="button"
      >
        <Icon name="close" />
      </button>

      <div className="detail-title">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span className="eyebrow">{t('places.profileEyebrow')} {localizedNeed}</span>
          <StatusBadge status={meta.status} size="sm" />
          <span className={`freshness-badge ${freshness.badgeClass}`} title={`${t('places.lastUpdated')} ${localizedFreshnessLabel}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Icon name={freshnessIcon} size={11} />
            <span>{localizedFreshnessLabel}</span>
          </span>
          {place.needsGeocoding ? (
            <span className="badge-needs-geocoding">{t('places.needsGeocodingBadge')}</span>
          ) : (
            <span className="badge-presurvey">{place.reportCount ? `${place.reportCount} ${t('places.citizenReportsCount')}` : t('places.unverifiedNoticeTitle')}</span>
          )}
        </div>

        <h2>{place.name}</h2>
        <span style={{ fontSize: '12px', color: '#576479', display: 'block', marginBottom: '4px' }}>
          {place.category} · Kec. {place.district} · {place.distance}
        </span>
        {place.address && <p className="detail-address">{place.address}</p>}
        <p className="detail-summary">{place.chainSummary}</p>
      </div>

      {conditionChanges.length > 0 && (
        <div role="status" className="drawer-history-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
            <Icon name="history" size={14} />
            <span>{t('places.conditionHistoryTitle')}</span>
          </div>
          {conditionChanges.map((change, idx) => (
            <div key={idx} style={{ marginTop: '4px', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <strong>{change.elementLabel}</strong> {t('places.updatedFrom')}{' '}
              <StatusBadge status={change.previousStatus} size="sm" variant="compact" />{' '}
              {t('places.to')}{' '}
              <StatusBadge status={change.currentStatus} size="sm" variant="compact" />{' '}
              {t('places.by')} <em>{change.currentReporter}</em> ({formatDate(new Date(change.currentDate), { day: 'numeric', month: 'numeric', year: 'numeric' })}).
            </div>
          ))}
        </div>
      )}

      {place.needsGeocoding && (
        <div className="geocoding-notice-box" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Icon name="warning" size={16} className="flex-shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <strong>{t('places.unlocatedNoticeTitle')}</strong> {t('places.unlocatedNoticeBody')}
          </div>
        </div>
      )}

      {place.reportCount ? (
        <div className="presurvey-notice-box" role="note">
          <span style={{ flexShrink: 0, marginTop: '2px' }}>
            <Icon name="camera" size={18} />
          </span>
          <div>
            <strong>{t('places.citizenReportsNoticeTitle')}</strong>
            <div style={{ fontSize: '11.5px', marginTop: '3px', lineHeight: 1.5, opacity: 0.9 }}>
              {place.reportCount} {t('places.citizenReportsCount')}
              {place.coverage ? ` (${place.coverage.known} / ${place.coverage.total} ${t('places.confirmedAccessPoints')})` : ''}.
              {unknownElements > 0 ? ` ${unknownElements} ${t('places.unconfirmedRemaining')}` : ` ${t('places.allConfirmedWithPhotos')}`}
            </div>
          </div>
        </div>
      ) : (
        <div className="presurvey-notice-box" role="note">
          <span style={{ flexShrink: 0, marginTop: '2px' }}>
            <Icon name="info" size={18} />
          </span>
          <div>
            <strong>{t('places.unverifiedNoticeTitle')}</strong>
            <div style={{ fontSize: '11.5px', marginTop: '3px', lineHeight: 1.5, opacity: 0.9 }}>
              {t('places.unverifiedNoticeBody')}
            </div>
          </div>
        </div>
      )}

      {place.features && place.features.length > 0 && (
        <div className="drawer-features-box">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
            {t('places.recordedFeatures')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {place.features.map((feat, idx) => (
              <span key={idx} className="drawer-feature-tag">
                {feat}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="evidence-disclosure">
        <summary className="evidence-disclosure-summary">
          <span className="evidence-disclosure-label">
            <Icon name="shield" size={14} />
            <span>{t('places.sourceVerificationSection')}</span>
          </span>
          <Icon name="chevron" size={15} className="evidence-disclosure-chevron" />
        </summary>

        <div className="evidence-disclosure-body">
          <div className="evidence-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#64748b' }}>{t('places.sourceLabel')}</span>{' '}
              <strong>{place.sourceName || t('places.publicData')}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>{t('places.licenseLabel')}</span>{' '}
              <strong>{place.sourceLicense || t('places.licenseOpen')}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>{t('places.evidenceTypeLabel')}</span>{' '}
              <span>{place.evidenceLevelLabel}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>{t('places.retrievedLabel')}</span>{' '}
              <span>{place.retrievedAt || '2026-09-13'}</span>
            </div>
          </div>

          {place.sourceUrl && (
            <div style={{ margin: '10px 0 0', fontSize: '12px' }}>
              <a
                href={place.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--purple, #6d45cc)', textDecoration: 'underline', wordBreak: 'break-all' }}
              >
                {t('places.openOriginalSource')}
              </a>
            </div>
          )}
        </div>
      </details>

      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '16px 0 8px', color: 'var(--ink, #1e293b)' }}>
        {t('places.accessConditionsTitle')}
      </h3>
      <AccessibilityChain key={`chain-${place.id}`} elements={place.elements} />

      <CorrectionHistory
        reports={historySettled ? history.reports : []}
        total={historySettled ? history.total : 0}
        state={historyState}
        onRetry={() => setHistoryAttempt((value) => value + 1)}
      />

      <div className="journey-hint" role="note">
        <Icon name="route" />
        <div>
          <strong>{t('places.journeyNotesTitle')}</strong>
          <span>
            {t('places.journeyNotesDesc')}
          </span>
        </div>
      </div>

      {googleMapsPlaceUrl && (
        <a
          id="btn-google-maps-directions"
          href={googleMapsPlaceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="google-maps-btn"
          style={{ width: '100%', marginTop: '14px' }}
          aria-label={t('places.gmapsDirectionsAria', { name: place.name })}
        >
          <Icon name="navigation" size={15} />
          <span>{t('places.gmapsDirections')}</span>
          <Icon name="external-link" size={13} />
        </a>
      )}

      <button
        id="btn-correct-place"
        className="secondary-action"
        style={{ width: '100%', marginTop: googleMapsPlaceUrl ? '8px' : '14px' }}
        onClick={() => onCorrectPlace(place)}
        type="button"
      >
        {t('places.reportChange')}
      </button>
      <p className="flow-help">
        {t('places.flowHelpReport')}{!signedIn && t('places.flowHelpReportAuth')}
      </p>
      <PlaceReviews key={String(place.id)} placeId={String(place.id)} onWrite={() => onWriteReview(place)} signedIn={signedIn} />
    </section>
  );
}
