'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Place, AccessibilityNeed, placeStatusMeta } from '@/types';
import { MapLegend } from './MapLegend';
import { Icon } from '@/components/ui/Icon';

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
  onFocusPlace?: (place: Place) => void;
  onAddPlaceAtLocation?: (location: { lat: number; lng: number; name?: string; address?: string }) => void;
  externalPreview?: { lat: number; lng: number; name?: string; address?: string } | null;
  onClearExternalPreview?: () => void;
  activeNeed?: AccessibilityNeed;
};

export function MapView({
  places,
  selectedPlace,
  onSelectPlace,
  onFocusPlace,
  onAddPlaceAtLocation,
  externalPreview,
  onClearExternalPreview,
  activeNeed = 'Mobilitas',
}: MapViewProps) {
  const [mapMode, setMapMode] = useState<'osm' | 'canvas'>('osm');
  const [optionsOpen, setOptionsOpen] = useState(false);

  const geocodedPlaces = places.filter((p) => !p.needsGeocoding);

  return (
    <div className="map-view-wrapper">
      <div className={`map-controls-overlay ${optionsOpen ? 'map-options-open' : ''}`}>
        <button
          type="button"
          className="map-options-toggle"
          aria-expanded={optionsOpen}
          aria-controls="map-display-options"
          onClick={() => setOptionsOpen(open => !open)}
        >
          <Icon name={optionsOpen ? 'close' : 'info'} size={16} />
          <span>{optionsOpen ? 'Tutup legenda' : 'Legenda'}</span>
        </button>
        <div id="map-display-options" className="map-display-options">
          <MapLegend />
          <div className="map-mode-toggle">
            <button
              type="button"
              className={mapMode === 'osm' ? 'active' : ''}
              aria-pressed={mapMode === 'osm'}
              onClick={() => setMapMode('osm')}
              title="Tampilan Peta Jalan Riil"
            >
              Peta Jalan
            </button>
            <button
              type="button"
              className={mapMode === 'canvas' ? 'active' : ''}
              aria-pressed={mapMode === 'canvas'}
              onClick={() => setMapMode('canvas')}
              title="Tampilan Skematik Cepat"
            >
              Skematik
            </button>
          </div>
        </div>
      </div>

      {mapMode === 'osm' ? (
        <div className="map-leaflet-wrapper">
          <DynamicLeafletMap
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={onSelectPlace}
            onFocusPlace={onFocusPlace}
            onAddPlaceAtLocation={onAddPlaceAtLocation}
            externalPreview={externalPreview}
            onClearExternalPreview={onClearExternalPreview}
            activeNeed={activeNeed}
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
          {geocodedPlaces.map((p) => {
            const meta = placeStatusMeta(p, activeNeed);
            return (
              <button
                key={p.id}
                id={`marker-place-${p.id}`}
                className={`marker marker-${meta.status.toLowerCase()} ${
                  selectedPlace?.id === p.id ? 'selected' : ''
                }`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => onSelectPlace(p)}
                aria-label={`${p.name}. Kebutuhan ${activeNeed}: ${meta.label}. ${p.chainSummary}`}
                type="button"
              >
                <span>{meta.symbol}</span>
                <b>{p.name}</b>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
