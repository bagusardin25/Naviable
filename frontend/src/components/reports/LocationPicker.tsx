'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import type { PickedPoint } from './LocationPickerMap';

// Leaflet needs `window`, so the mini map only ever renders in the browser.
const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), {
  ssr: false,
  loading: () => <div className="location-picker-map location-picker-map-loading" aria-hidden="true" />,
});

// Beyond this the device fix may land on the wrong building, so ask for a check.
const LOW_ACCURACY_METERS = 100;

type GeoState =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'found' | 'lowAccuracy'; accuracy: number }
  | { kind: 'denied' | 'unavailable' | 'unsupported' };

type LocationPickerProps = {
  point: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
};

/**
 * "Pilih Lokasi" — the first step of Tambah Lokasi. The contributor sets the point
 * from the device location or on a mini map; the form derives the address and the
 * (read-only) coordinates from it. When location access is denied or inaccurate,
 * the map opens so the point can still be chosen by hand.
 */
export function LocationPicker({ point, onPick }: LocationPickerProps) {
  const { t } = useTranslation();
  const [mapOpen, setMapOpen] = useState(point !== null);
  const [geo, setGeo] = useState<GeoState>({ kind: 'idle' });

  function locateDevice() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeo({ kind: 'unsupported' });
      setMapOpen(true);
      return;
    }
    setGeo({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = Math.round(position.coords.accuracy);
        onPick({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setGeo({ kind: accuracy > LOW_ACCURACY_METERS ? 'lowAccuracy' : 'found', accuracy });
        // Show the pin so the contributor can check it and nudge it if needed.
        setMapOpen(true);
      },
      (error) => {
        setGeo({ kind: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' });
        setMapOpen(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  function pickOnMap(next: PickedPoint) {
    // A manual pick supersedes whatever the device-location message said.
    setGeo({ kind: 'idle' });
    onPick(next);
  }

  let message: { tone: 'info' | 'success' | 'warning'; text: string } | null = null;
  if (geo.kind === 'locating') message = { tone: 'info', text: t('reports.locatingDevice') };
  else if (geo.kind === 'found') message = { tone: 'success', text: t('reports.deviceLocationFound', { accuracy: geo.accuracy }) };
  else if (geo.kind === 'lowAccuracy') message = { tone: 'warning', text: t('reports.deviceLocationLowAccuracy', { accuracy: geo.accuracy }) };
  else if (geo.kind === 'denied') message = { tone: 'warning', text: t('reports.locationPermissionDenied') };
  else if (geo.kind === 'unavailable') message = { tone: 'warning', text: t('reports.locationUnavailable') };
  else if (geo.kind === 'unsupported') message = { tone: 'warning', text: t('reports.locationUnsupported') };

  return (
    <section className="location-picker" aria-labelledby="location-picker-title">
      <div className="location-picker-head">
        <h3 id="location-picker-title">
          <Icon name="map-pin" size={16} />
          <span>{t('reports.locationPickerTitle')}</span>
        </h3>
        <p>{t('reports.locationPickerDesc')}</p>
      </div>

      <div className="location-picker-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={locateDevice}
          disabled={geo.kind === 'locating'}
        >
          <Icon name={geo.kind === 'locating' ? 'spinner' : 'navigation'} size={16} />
          <span>{t('reports.useMyLocation')}</span>
        </button>
        <button
          type="button"
          className="secondary-action"
          aria-expanded={mapOpen}
          aria-controls="location-picker-map-panel"
          onClick={() => setMapOpen((open) => !open)}
        >
          <Icon name="map" size={16} />
          <span>{mapOpen ? t('reports.hideMap') : t('reports.pickOnMap')}</span>
        </button>
      </div>

      {message && (
        <p
          className={`location-picker-status is-${message.tone}`}
          role={message.tone === 'warning' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      {mapOpen && (
        <div id="location-picker-map-panel" className="location-picker-map-panel">
          <LocationPickerMap
            point={point}
            onPick={pickOnMap}
            ariaLabel={t('reports.mapPickerAria')}
            centerButtonLabel={t('reports.pinMapCenter')}
          />
          <p className="flow-help">{point ? t('reports.mapAdjustHint') : t('reports.mapPickHint')}</p>
        </div>
      )}
    </section>
  );
}
