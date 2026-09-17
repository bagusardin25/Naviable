import React from 'react';
import { Place } from '@/types';
import { PlaceCard } from './PlaceCard';

type PlaceListProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  className?: string;
};

export function PlaceList({ places, selectedPlace, onSelectPlace, className = '' }: PlaceListProps) {
  const geocodedCount = places.filter((p) => !p.needsGeocoding).length;
  const unlocatedCount = places.filter((p) => p.needsGeocoding).length;

  return (
    <aside className={`places-panel ${className}`.trim()} aria-label="Daftar tempat setara dengan peta">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Dual view · Surabaya Seed Data</span>
          <h2>Daftar Lokasi</h2>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            <span>{geocodedCount} titik di peta</span>
            {unlocatedCount > 0 && <span> · {unlocatedCount} perlu geocoding</span>}
          </div>
        </div>
        <span className="count-pill">{places.length} lokasi</span>
      </div>

      <div className="place-list" role="list">
        {places.length === 0 ? (
          <div className="empty-places" style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
            <p>Tidak ada tempat yang cocok dengan filter atau kata kunci pencarian.</p>
          </div>
        ) : (
          places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSelected={selectedPlace?.id === place.id}
              onSelect={() => onSelectPlace(place)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
