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
      <div className="place-title-row">
        <div>
          <strong>{place.name}</strong>
          <span>
            {place.category} · {place.district} · {place.distance}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
          <span className={`status-badge ${meta.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Icon name={statusIcon} size={11} />
            <span>{meta.label}</span>
          </span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <span className={`freshness-badge ${freshness.badgeClass}`} title={`Pembaruan: ${freshness.label}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
        </div>
      </div>

      <p>{place.chainSummary}</p>

      {place.bottlenecks && place.bottlenecks.length > 0 && (
        <div style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '4px 9px', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="warning" size={14} className="flex-shrink-0" />
          <span>Perhatian: {place.bottlenecks.length} titik akses perlu diperhatikan</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="badge-evidence" title={`Sumber: ${place.evidenceLevelLabel}`}>
          {place.sourceName || 'Data publik'}
        </span>
        <span style={{ fontSize: '11px', color: '#576479' }}>
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

