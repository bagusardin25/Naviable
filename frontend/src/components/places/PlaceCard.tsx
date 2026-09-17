import React from 'react';
import { Place, STATUS_META, placeStatusMeta } from '@/types';

type PlaceCardProps = {
  place: Place;
  isSelected: boolean;
  onSelect: () => void;
};

export function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  const meta = placeStatusMeta(place);
  // Screen readers must not hear "pre-survey" once contributor evidence exists: the
  // accessible name has to match what the card is actually claiming.
  const statusDescription = place.reportCount
    ? `status dari bukti kontributor: ${STATUS_META[place.overall].label}`
    : `status pre-survey: ${meta.label}`;

  return (
    <button
      id={`place-card-${place.id}`}
      type="button"
      className={`place-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
      aria-label={`Pilih lokasi ${place.name}, ${statusDescription}`}
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
            <span className="badge-presurvey">{place.reportCount ? `${place.reportCount} LAPORAN` : 'PRE-SURVEY'}</span>
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
