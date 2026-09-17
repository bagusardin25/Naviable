'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Place, STATUS_META } from '@/types';

type LeafletMapProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
};

const SURABAYA_CENTER: [number, number] = [-7.2758, 112.7483];

function MapPanController({ selectedPlace }: { selectedPlace: Place | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedPlace) {
      map.panTo([selectedPlace.lat, selectedPlace.lng], { animate: true, duration: 0.5 });
    }
  }, [selectedPlace, map]);

  return null;
}

function createMarkerIcon(place: Place, isSelected: boolean) {
  const meta = STATUS_META[place.overall];
  const isSelectedClass = isSelected ? 'selected' : '';
  const statusClass = `marker-${place.overall.toLowerCase()}`;

  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div class="marker ${statusClass} ${isSelectedClass}">
        <span>${meta.symbol}</span>
        <b>${place.name}</b>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

export default function LeafletMap({ places, selectedPlace, onSelectPlace }: LeafletMapProps) {
  return (
    <MapContainer
      center={SURABAYA_CENTER}
      zoom={13}
      scrollWheelZoom={true}
      className="leaflet-map-container"
      style={{ width: '100%', height: '100%' }}
      aria-label="Peta interaktif aksesibilitas Surabaya"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapPanController selectedPlace={selectedPlace} />

      {places.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        const icon = createMarkerIcon(place, isSelected);

        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectPlace(place),
            }}
          >
            <Popup>
              <div className="map-popup-card">
                <strong>{place.name}</strong>
                <span className="popup-category">{place.category} · {place.district}</span>
                <p>{place.chainSummary}</p>
                <button
                  type="button"
                  className="popup-btn"
                  onClick={() => onSelectPlace(place)}
                >
                  Buka Detail Rantai Akses →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
