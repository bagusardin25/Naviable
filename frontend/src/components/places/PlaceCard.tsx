import React from 'react';
import { Place, STATUS_META, placeStatusMeta, getEvidenceFreshness, AccessibilityNeed } from '@/types';

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
          <span className={`status-badge ${meta.badgeClass}`}>
            <strong>{meta.symbol}</strong> {meta.label}
          </span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <span className={`freshness-badge ${freshness.badgeClass}`} title={`Pembaruan: ${freshness.label}`}>
              {freshness.symbol} {freshness.label}
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
        <div style={{ fontSize: '12px', color: '#b45309', background: '#fef3c7', padding: '4px 9px', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>⚠️</span>
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

