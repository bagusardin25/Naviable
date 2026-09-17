'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Place, STATUS_META } from '@/types';
import { MapLegend } from './MapLegend';

const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading-placeholder">
      <div className="map-spinner" />
      <span>Memuat peta interaktif Surabaya...</span>
    </div>
  ),
});

type MapViewProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
};

export function MapView({ places, selectedPlace, onSelectPlace }: MapViewProps) {
  const [mapMode, setMapMode] = useState<'osm' | 'canvas'>('osm');

  return (
    <div className="map-view-wrapper">
      <div className="map-controls-overlay">
        <MapLegend />
        <div className="map-mode-toggle">
          <button
            type="button"
            className={mapMode === 'osm' ? 'active' : ''}
            onClick={() => setMapMode('osm')}
            title="Tampilan Peta OSM Riil"
          >
            Satelit / OSM
          </button>
          <button
            type="button"
            className={mapMode === 'canvas' ? 'active' : ''}
            onClick={() => setMapMode('canvas')}
            title="Tampilan Skematik Cepat"
          >
            Skematik
          </button>
        </div>
      </div>

      {mapMode === 'osm' ? (
        <div className="map-leaflet-wrapper">
          <DynamicLeafletMap
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={onSelectPlace}
          />
        </div>
      ) : (
        <div className="map-canvas" aria-label="Kanvas skematik kota Surabaya">
          <div className="river river-a" />
          <div className="river river-b" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`v${i}`} className="road vertical" style={{ left: `${10 + i * 14}%` }} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`h${i}`} className="road horizontal" style={{ top: `${14 + i * 15}%` }} />
          ))}
          <div className="artery" />
          <span className="map-label label-a">Jl. Raya Darmo</span>
          <span className="map-label label-b">Jl. Wonokromo</span>
          <span className="map-label label-c">Jl. Basuki Rahmat</span>
          {places.map((p) => (
            <button
              key={p.id}
              id={`marker-place-${p.id}`}
              className={`marker marker-${p.overall.toLowerCase()} ${
                selectedPlace?.id === p.id ? 'selected' : ''
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => onSelectPlace(p)}
              aria-label={`${p.name}. ${p.chainSummary}`}
              type="button"
            >
              <span>{STATUS_META[p.overall].symbol}</span>
              <b>{p.name}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
