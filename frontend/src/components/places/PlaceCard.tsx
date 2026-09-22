'use client';

import React from 'react';
import { Place, placeStatusMeta, getEvidenceFreshness, AccessibilityNeed } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { extractStreetName } from '@/lib/streetSearch';
import { useTranslation } from '@/hooks/useTranslation';

type PlaceCardProps = {
  place: Place;
  isSelected: boolean;
  onSelect: () => void;
  activeNeed?: AccessibilityNeed;
};

export function PlaceCard({ place, isSelected, onSelect, activeNeed = 'Mobilitas' }: PlaceCardProps) {
  const { t, locale } = useTranslation();
  const meta = placeStatusMeta(place, activeNeed);
  const freshness = getEvidenceFreshness(place.updatedAt);
  const streetName = extractStreetName(place.address);
  const localizedStatus = t(`status.${meta.status}.label`, meta.label);
  const localizedFreshness = t(`freshness.${freshness.level}`, freshness.label);
  const statusDescription = `${localizedStatus}, ${locale === 'en' ? 'condition' : 'kondisi'}: ${localizedFreshness}`;

  const freshnessIcon =
    freshness.level === 'fresh'
      ? 'check-circle'
      : freshness.level === 'aging'
      ? 'clock'
      : freshness.level === 'stale'
      ? 'history'
      : 'info';

  return (
    <button
      id={`place-card-${place.id}`}
      type="button"
      className={`place-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
      aria-label={`${locale === 'en' ? 'Select' : 'Pilih'} ${place.name}: ${statusDescription}`}
    >
      <div className="place-card-header">
        <strong className="place-card-title">{place.name}</strong>
        <span className="place-card-meta">
          {place.category} · {place.district} · {place.distance}
          {streetName && (
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              📍 {streetName}
            </span>
          )}
        </span>
      </div>
      <div className="place-card-badges">
        <StatusBadge status={meta.status} size="sm" label={localizedStatus} />
        <span className={`freshness-badge ${freshness.badgeClass}`} title={`${locale === 'en' ? 'Update' : 'Pembaruan'}: ${localizedFreshness}`}>
          <Icon name={freshnessIcon} size={11} />
          <span>{localizedFreshness}</span>
        </span>
        {place.needsGeocoding ? (
          <span className="badge-needs-geocoding" title={locale === 'en' ? 'No precise coordinates' : 'Belum memiliki koordinat peta presisi'}>
            {t('places.needsGeocodingBadge')}
          </span>
        ) : (
          <span className="badge-presurvey">
            {place.reportCount ? `${place.reportCount} ${t('places.citizenReportsCount')}` : t('freshness.notReviewed')}
          </span>
        )}
      </div>

      <p className="place-card-summary">{place.chainSummary}</p>

      {place.bottlenecks && place.bottlenecks.length > 0 && (
        <div className="place-bottleneck-warning">
          <Icon name="warning" size={14} className="flex-shrink-0" />
          <span>
            {locale === 'en'
              ? `Attention: ${place.bottlenecks.length} access bottlenecks observed`
              : `Perhatian: ${place.bottlenecks.length} titik akses perlu diperhatikan`}
          </span>
        </div>
      )}

      <div className="place-card-footer-meta">
        <span className="badge-evidence" title={`${locale === 'en' ? 'Source' : 'Sumber'}: ${place.evidenceLevelLabel}`}>
          {place.sourceName || (locale === 'en' ? 'Open data' : 'Data publik')}
        </span>
        <span className="place-features-count">
          {place.features && place.features.length > 0
            ? `${place.features.length} ${t('places.recordedFeatures').replace(/:\s*$/, '')}`
            : locale === 'en'
            ? '0 initial features'
            : '0 fasilitas awal'}
        </span>
      </div>
      {/* The cryptic 1–8 element grid was removed from the list card to reduce noise;
          the full E1–E8 chain is shown in the place detail drawer. */}
    </button>
  );
}

