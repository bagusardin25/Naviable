import React from 'react';
import { Place, STATUS_META, WHEELCHAIR_STATUS_META } from '@/types';

type PlaceCardProps = {
  place: Place;
  isSelected: boolean;
  onSelect: () => void;
};

export function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  const meta = WHEELCHAIR_STATUS_META[place.wheelchairStatus] || WHEELCHAIR_STATUS_META.unknown;

  return (
    <button
      id={`place-card-${place.id}`}
      type="button"
      className={`place-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
      aria-label={`Pilih lokasi ${place.name}, status pre-survey: ${meta.label}`}
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
          {place.needsGeocoding ? (
            <span className="badge-needs-geocoding" title="Belum memiliki koordinat map presisi">
              Perlu Geocoding
            </span>
          ) : (
            <span className="badge-presurvey">PRE-SURVEY</span>
          )}
        </div>
      </div>

      <p>{place.chainSummary}</p>

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
            title={`${e.code} ${e.label}: ${STATUS_META[e.status].label} (${e.isPreSurveyEvidence ? 'Pre-survey evidence' : 'Belum diverifikasi'})`}
            aria-label={`${e.code} ${e.label}: ${STATUS_META[e.status].label}`}
          >
            {e.code.replace('E', '')}
          </i>
        ))}
      </div>
    </button>
  );
}
