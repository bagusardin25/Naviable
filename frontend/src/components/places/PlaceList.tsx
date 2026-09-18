import React from 'react';
import { Place, AccessibilityNeed } from '@/types';
import { PlaceCard } from './PlaceCard';

type PlaceListProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  className?: string;
  activeNeed?: AccessibilityNeed;
};

export function PlaceList({ places, selectedPlace, onSelectPlace, className = '', activeNeed = 'Mobilitas' }: PlaceListProps) {
  const geocodedCount = places.filter((p) => !p.needsGeocoding).length;
  const unlocatedCount = places.filter((p) => p.needsGeocoding).length;

  return (
    <aside className={`places-panel ${className}`.trim()} aria-label="Daftar tempat">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Data tempat Surabaya</span>
          <h2>Daftar Tempat</h2>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            <span>{geocodedCount} titik di peta</span>
            {unlocatedCount > 0 && <span> · {unlocatedCount} belum ada titik peta</span>}
          </div>
        </div>
        <span className="count-pill">{places.length} tempat</span>
      </div>

      <div className="place-list" role="list">
        {places.length === 0 ? (
          <div className="empty-places" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
              Belum ada tempat yang cocok
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Coba gunakan nama tempat lain atau atur ulang filter pencarian.
            </p>
          </div>
        ) : (
          places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSelected={selectedPlace?.id === place.id}
              onSelect={() => onSelectPlace(place)}
              activeNeed={activeNeed}
            />
          ))
        )}
      </div>
    </aside>
  );
}
