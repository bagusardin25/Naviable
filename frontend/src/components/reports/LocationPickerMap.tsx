'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { createTemporaryMarkerIcon } from '@/components/map/markerIcons';
import { Icon } from '@/components/ui/Icon';

export type PickedPoint = { lat: number; lng: number };

const SURABAYA_CENTER: [number, number] = [-7.2575, 112.7521];

// Six decimals (~0.1 m) matches the precision the Jelajahi map hands to the form.
const round = (value: number) => Number(value.toFixed(6));

function ClickToPick({ onPick }: { onPick: (point: PickedPoint) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }),
  });
  return null;
}

type LocationPickerMapProps = {
  point: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
  ariaLabel: string;
  centerButtonLabel: string;
};

/**
 * Mini map inside the Tambah Lokasi form: click to drop the pin, drag it to adjust.
 * The "pin the map center" button gives keyboard users (who pan with the arrow
 * keys) a way to choose a point without a pointer.
 */
export default function LocationPickerMap({ point, onPick, ariaLabel, centerButtonLabel }: LocationPickerMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const icon = useMemo(() => createTemporaryMarkerIcon(), []);

  // Leaflet measures its container on mount; re-measure once the form layout settles.
  useEffect(() => {
    if (!map) return;
    const timer = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(timer);
  }, [map]);

  // Bring points set from outside the map (device location) into view, without
  // re-panning when the contributor clicks inside the visible area.
  useEffect(() => {
    if (!map || !point) return;
    const target = L.latLng(point.lat, point.lng);
    if (!map.getBounds().contains(target)) map.setView(target, Math.max(map.getZoom(), 16));
  }, [map, point]);

  return (
    <div className="location-picker-map-wrap" role="group" aria-label={ariaLabel}>
      <MapContainer
        ref={setMap}
        center={point ? [point.lat, point.lng] : SURABAYA_CENTER}
        zoom={point ? 17 : 13}
        scrollWheelZoom={false}
        className="location-picker-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (ODbL)'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPick onPick={onPick} />
        {point && (
          <Marker
            position={[point.lat, point.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onPick({ lat: round(pos.lat), lng: round(pos.lng) });
              },
            }}
          />
        )}
      </MapContainer>
      <button
        type="button"
        className="location-picker-center-btn"
        disabled={!map}
        onClick={() => {
          if (!map) return;
          const center = map.getCenter();
          onPick({ lat: round(center.lat), lng: round(center.lng) });
        }}
      >
        <Icon name="target" size={14} />
        <span>{centerButtonLabel}</span>
      </button>
    </div>
  );
}
