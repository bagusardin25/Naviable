import React from 'react';
import { Place } from '@/types';
import { PlaceCard } from './PlaceCard';

type PlaceListProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
};

export function PlaceList({ places, selectedPlace, onSelectPlace }: PlaceListProps) {
  return (
    <aside className="places-panel" aria-label="Daftar tempat setara dengan peta">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Dual view</span>
          <h2>Tempat di Surabaya</h2>
        </div>
        <span className="count-pill">{places.length} lokasi</span>
      </div>

      <div className="place-list" role="list">
        {places.length === 0 ? (
          <div className="empty-places">
            <p>Tidak ada tempat yang cocok dengan kata kunci pencarian.</p>
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
