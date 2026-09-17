import React from 'react';
import { Place, STATUS_META } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

type PlaceCardProps = {
  place: Place;
  isSelected: boolean;
  onSelect: () => void;
};

export function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  return (
    <button
      id={`place-card-${place.id}`}
      type="button"
      className={`place-card ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
      aria-label={`Pilih lokasi ${place.name}, status ${STATUS_META[place.overall].label}`}
    >
      <div className="place-title-row">
        <div>
          <strong>{place.name}</strong>
          <span>
            {place.category} · {place.district} · {place.distance}
          </span>
        </div>
        <StatusBadge status={place.overall} />
      </div>

      <p>{place.chainSummary}</p>

      <div className="chain-mini" aria-label="Ringkasan rantai 8 elemen aksesibilitas">
        {place.elements.map((e) => (
          <i
            key={e.code}
            className={`chain-cell cell-${e.status.toLowerCase()}`}
            title={`${e.code} ${e.label}: ${STATUS_META[e.status].label}`}
            aria-label={`${e.code} ${e.label}: ${STATUS_META[e.status].label}`}
          >
            {e.code.replace('E', '')}
          </i>
        ))}
      </div>
    </button>
  );
}
