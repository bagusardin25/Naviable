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
  const statusDescription = `${meta.label}, kesegaran data: ${freshness.label}`;

  return (
    <button
      id={`place-card-${place.id}`}
      type="button"
      className={`place-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
      aria-label={`Pilih lokasi ${place.name}, profil ${activeNeed}: ${statusDescription}`}
    >
      <div className="place-title-row">
        <div>
          <strong>{place.name}</strong>
          <span>
            {place.category} · {place.district} · {place.distance}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span className={`status-badge ${meta.badgeClass}`}>
            <strong>{meta.symbol}</strong> {meta.label}
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span className={`freshness-badge ${freshness.badgeClass}`} title={`Kesegaran data: ${freshness.label}`}>
              {freshness.symbol} {freshness.label}
            </span>
            {place.needsGeocoding ? (
              <span className="badge-needs-geocoding" title="Belum memiliki koordinat map presisi">
                Perlu Geocoding
              </span>
            ) : (
              <span className="badge-presurvey">{place.reportCount ? `${place.reportCount} LAPORAN` : 'PRE-SURVEY'}</span>
            )}
          </div>
        </div>
      </div>

      <p>{place.chainSummary}</p>

      {place.bottlenecks && place.bottlenecks.length > 0 && (
        <div style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>⚠️</span>
          <span>Perhatian profil {activeNeed}: {place.bottlenecks.length} titik perlu kewaspadaan</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="badge-evidence" title={`Tingkat bukti: ${place.evidenceLevelLabel}`}>
          {place.sourceName || 'OpenStreetMap'}
        </span>
        <span style={{ fontSize: '10px', color: '#64748b' }}>
          {place.features && place.features.length > 0 ? `${place.features.length} fitur awal` : '0 fitur awal'}
        </span>
      </div>

      <div className="chain-mini" aria-label="Ringkasan rantai 8 elemen aksesibilitas">
        {place.elements.map((e) => (
          <i
            key={e.code}
            className={`chain-cell cell-${e.status.toLowerCase()}`}
            title={`${e.code} ${e.label}: ${STATUS_META[e.status].label} (${e.lockedBy === 'kontributor' ? 'Dikonfirmasi kontributor' : e.isPreSurveyEvidence ? 'Pre-survey evidence' : 'Belum diverifikasi'})`}
            aria-label={`${e.code} ${e.label}: ${STATUS_META[e.status].label}`}
          >
            {e.code.replace('E', '')}
          </i>
        ))}
      </div>
    </button>
  );
}

