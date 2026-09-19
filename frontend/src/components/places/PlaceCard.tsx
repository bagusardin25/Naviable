import React from 'react';
import { Place, STATUS_META, placeStatusMeta, getEvidenceFreshness, AccessibilityNeed } from '@/types';
import { Icon } from '@/components/ui/Icon';

type PlaceCardProps = {
  place: Place;
  isSelected: boolean;
  onSelect: () => void;
  activeNeed?: AccessibilityNeed;
};

export function PlaceCard({ place, isSelected, onSelect, activeNeed = 'Mobilitas' }: PlaceCardProps) {
  const meta = placeStatusMeta(place, activeNeed);
  const freshness = getEvidenceFreshness(place.updatedAt);
  const statusDescription = `${meta.label}, kondisi: ${freshness.label}`;

  const statusIcon =
    meta.status === 'UTUH'
      ? 'check-circle'
      : meta.status === 'TERHALANG'
      ? 'warning'
      : meta.status === 'TIDAK_STANDAR'
      ? 'alert-circle'
      : meta.status === 'TIDAK_ADA'
      ? 'x-circle'
      : 'help-circle';

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
      aria-label={`Pilih ${place.name}: ${statusDescription}`}
    >
      <div className="place-card-header">
        <strong className="place-card-title">{place.name}</strong>
        <span className="place-card-meta">
          {place.category} · {place.district} · {place.distance}
        </span>
      </div>

      <div className="place-card-badges">
        <span className={`status-badge ${meta.badgeClass}`} data-status={meta.status}>
          <Icon name={statusIcon} size={11} />
          <span>{meta.label}</span>
        </span>
        <span className={`freshness-badge ${freshness.badgeClass}`} title={`Pembaruan: ${freshness.label}`}>
          <Icon name={freshnessIcon} size={11} />
          <span>{freshness.label}</span>
        </span>
        {place.needsGeocoding ? (
          <span className="badge-needs-geocoding" title="Belum memiliki koordinat peta presisi">
            Belum ada titik peta
          </span>
        ) : (
          <span className="badge-presurvey">
            {place.reportCount ? `${place.reportCount} laporan warga` : 'Belum diverifikasi'}
          </span>
        )}
      </div>

      <p className="place-card-summary">{place.chainSummary}</p>

      {place.bottlenecks && place.bottlenecks.length > 0 && (
        <div className="place-bottleneck-warning">
          <Icon name="warning" size={14} className="flex-shrink-0" />
          <span>Perhatian: {place.bottlenecks.length} titik akses perlu diperhatikan</span>
        </div>
      )}

      <div className="place-card-footer-meta">
        <span className="badge-evidence" title={`Sumber: ${place.evidenceLevelLabel}`}>
          {place.sourceName || 'Data publik'}
        </span>
        <span className="place-features-count">
          {place.features && place.features.length > 0 ? `${place.features.length} fasilitas tercatat` : '0 fasilitas awal'}
        </span>
      </div>

      <div className="chain-mini" aria-label="8 titik kondisi akses">
        {place.elements.map((e) => (
          <i
            key={e.code}
            className={`chain-cell cell-${e.status.toLowerCase()}`}
            title={`${e.code} ${e.label}: ${STATUS_META[e.status].label} (${e.lockedBy === 'kontributor' ? 'Diverifikasi warga' : e.isPreSurveyEvidence ? 'Informasi awal' : 'Belum diverifikasi'})`}
            aria-label={`${e.code} ${e.label}: ${STATUS_META[e.status].label}`}
          >
            {e.code.replace('E', '')}
          </i>
        ))}
      </div>
    </button>
  );
}

