'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Place, placeStatusMeta } from '@/types';
import { Icon } from '@/components/ui/Icon';

type LeafletMapProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  activeNeed?: import('@/types').AccessibilityNeed;
};

const SURABAYA_CENTER: [number, number] = [-7.2758, 112.7483];

/**
 * Controller to handle flyTo when a place is selected
 */
function MapPanController({ selectedPlace }: { selectedPlace: Place | null }) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedPlace &&
      typeof selectedPlace.lat === 'number' &&
      typeof selectedPlace.lng === 'number' &&
      !selectedPlace.needsGeocoding
    ) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedPlace, map]);

  return null;
}

/**
 * Controller to fit bounds across all valid places on initial load
 */
function MapBoundsController({
  places,
}: {
  places: (Place & { lat: number; lng: number })[];
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (places.length > 0 && !hasFittedRef.current) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      hasFittedRef.current = true;
    }
  }, [places, map]);

  return null;
}

/**
 * Controller to invalidate Leaflet map size on viewport changes or mobile tab switch
 */
function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    function handleResize() {
      map.invalidateSize();
    }

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

/**
 * Optional user geolocation button control
 */
function UserLocationButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const handleLocate = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Fitur geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const latLng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(latLng);
        map.flyTo(latLng, 15, { animate: true });
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation warning:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <>
      <div
        className="leaflet-bottom leaflet-right"
        style={{ marginBottom: '26px', marginRight: '14px', pointerEvents: 'auto' }}
      >
        <div className="leaflet-bar leaflet-control" style={{ border: 'none' }}>
          <button
            type="button"
            onClick={handleLocate}
            title="Pusatkan ke lokasi saya (GPS)"
            aria-label="Pusatkan ke lokasi saya"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              width: '38px',
              height: '38px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#1a56db',
              borderRadius: '10px',
              boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
            }}
          >
            {locating ? (
              <Icon name="spinner" size={18} className="animate-spin" />
            ) : (
              <Icon name="target" size={18} />
            )}
          </button>
        </div>
      </div>
      {userPos && (
        <Marker
          position={userPos}
          icon={L.divIcon({
            className: 'user-location-pin',
            html: `<div style="background-color:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 12px rgba(37,99,235,0.9);" title="Lokasi Anda"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })}
        >
          <Popup>
            <div style={{ padding: '4px', fontSize: '12px', fontWeight: 600 }}>
              Lokasi Anda saat ini
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}

function createMarkerIcon(place: Place, isSelected: boolean, activeNeed: import('@/types').AccessibilityNeed = 'Mobilitas') {
  const meta = placeStatusMeta(place, activeNeed);
  const isSelectedClass = isSelected ? 'selected' : '';
  const statusClass = meta.status.toLowerCase();
  const marker = document.createElement('div');
  marker.className = `marker marker-${statusClass} ${isSelectedClass}`;
  marker.title = `${place.name} — Kebutuhan ${activeNeed}: ${meta.label}`;
  const symbol = document.createElement('span');
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = meta.symbol;
  const label = document.createElement('b');
  label.textContent = place.name;
  marker.append(symbol, label);
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: marker,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

export default function LeafletMap({ places, selectedPlace, onSelectPlace, activeNeed = 'Mobilitas' }: LeafletMapProps) {
  // CRITICAL: Filter only places with valid lat/lng and not marked as needsGeocoding
  const validPlaces = places.filter(
    (p): p is Place & { lat: number; lng: number } =>
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      !isNaN(p.lat) &&
      !isNaN(p.lng) &&
      !p.needsGeocoding
  );

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (ODbL)'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBoundsController places={validPlaces} />
      <MapPanController selectedPlace={selectedPlace} />
      <MapResizeController />
      <UserLocationButton />

      {validPlaces.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        const icon = createMarkerIcon(place, isSelected, activeNeed);
        const meta = placeStatusMeta(place, activeNeed);

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
                <span className="popup-category">
                  {place.category} · {place.district}
                </span>

                <div className="popup-badge-row">
                  <span className={`status-badge ${meta.badgeClass}`}>
                    {meta.symbol} {meta.label}
                  </span>
                  <span className="badge-presurvey">{place.reportCount ? `${place.reportCount} laporan warga` : 'Data awal'}</span>
                </div>

                {place.address && (
                  <p style={{ margin: '4px 0 6px', fontSize: '11px', color: '#64748b' }}>
                    {place.address}
                  </p>
                )}

                {place.features && place.features.length > 0 && (
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155' }}>
                      Catatan fasilitas:
                    </span>
                    <ul className="popup-features">
                      {place.features.slice(0, 3).map((feat, idx) => (
                        <li key={idx}>{feat}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="popup-disclaimer" style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Icon name="info" size={14} className="flex-shrink-0" style={{ marginTop: '1px' }} />
                  <span>Data awal bersumber dari {place.sourceName || 'OpenStreetMap'}. Belum diverifikasi langsung oleh warga.</span>
                </div>

                <button
                  type="button"
                  className="popup-btn"
                  style={{ marginTop: '8px' }}
                  onClick={() => onSelectPlace(place)}
                >
                  Lihat kondisi akses →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
