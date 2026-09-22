'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Place, AccessibilityNeed } from '@/types';
import { MapLegend } from './MapLegend';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

function MapLoadingPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="map-loading-placeholder">
      <div className="map-spinner" />
      <span>{t('map.mapLoading')}</span>
    </div>
  );
}

const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <MapLoadingPlaceholder />,
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
  const { t } = useTranslation();
  const [optionsOpen, setOptionsOpen] = useState(false);

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
          <span>{optionsOpen ? t('map.closeLegend') : t('map.legendTitle')}</span>
        </button>
        <div id="map-display-options" className="map-display-options">
          <MapLegend />
        </div>
      </div>

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
    </div>
  );
}
