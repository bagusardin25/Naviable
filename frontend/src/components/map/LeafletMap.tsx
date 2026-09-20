'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Place, placeStatusMeta } from '@/types';
import { Icon } from '@/components/ui/Icon';

export interface SelectedMapLocation {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

type LeafletMapProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  onAddPlaceAtLocation?: (location: SelectedMapLocation) => void;
  externalPreview?: SelectedMapLocation | null;
  onClearExternalPreview?: () => void;
  activeNeed?: import('@/types').AccessibilityNeed;
};

const SURABAYA_CENTER: [number, number] = [-7.2758, 112.7483];

/**
 * Controller to handle flyTo when a place or external POI is selected
 */
function MapPanController({
  selectedPlace,
  externalPreview,
}: {
  selectedPlace: Place | null;
  externalPreview?: SelectedMapLocation | null;
}) {
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

  useEffect(() => {
    if (
      externalPreview &&
      typeof externalPreview.lat === 'number' &&
      typeof externalPreview.lng === 'number'
    ) {
      map.flyTo([externalPreview.lat, externalPreview.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [externalPreview, map]);

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
    const container = map.getContainer();
    let frame = 0;

    function handleResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          map.invalidateSize({ pan: false });
        }
      });
    }

    // Tab visibility and toolbar changes can resize the map without a window resize.
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    handleResize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
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

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function createTemporaryMarkerIcon() {
  const wrapper = document.createElement('div');
  wrapper.className = 'temporary-pin-wrapper';
  wrapper.innerHTML = `
    <div class="temporary-pin-pulse"></div>
    <div class="temporary-pin">
      <div class="temporary-pin-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
          <line x1="12" y1="7" x2="12" y2="13"/>
          <line x1="9" y1="10" x2="15" y2="10"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    className: 'temporary-location-pin',
    html: wrapper,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      const target = e.originalEvent?.target as Element | null;
      if (
        target &&
        typeof target.closest === 'function' &&
        (target.closest('.leaflet-marker-icon') ||
          target.closest('.leaflet-control') ||
          target.closest('.leaflet-popup'))
      ) {
        return;
      }
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function createMarkerIcon(place: Place, isSelected: boolean, activeNeed: import('@/types').AccessibilityNeed = 'Mobilitas') {
  const meta = placeStatusMeta(place, activeNeed);
  const isSelectedClass = isSelected ? 'selected' : '';
  const statusClass = meta.status.toLowerCase();
  const marker = document.createElement('div');
  marker.className = `marker marker-${statusClass} ${isSelectedClass}`;
  marker.setAttribute('data-status', meta.status);
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

export default function LeafletMap({
  places,
  selectedPlace,
  onSelectPlace,
  onAddPlaceAtLocation,
  externalPreview,
  onClearExternalPreview,
  activeNeed = 'Mobilitas',
}: LeafletMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<SelectedMapLocation | null>(null);

  useEffect(() => {
    if (externalPreview) {
      setSelectedLocation(externalPreview);
    }
  }, [externalPreview]);

  // CRITICAL: Filter only places with valid lat/lng and not marked as needsGeocoding
  const validPlaces = places.filter(
    (p): p is Place & { lat: number; lng: number } =>
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      !isNaN(p.lat) &&
      !isNaN(p.lng) &&
      !p.needsGeocoding
  );

  const nearbyPlaces = useMemo(() => {
    if (!selectedLocation) return [];
    return validPlaces
      .map((p) => ({
        place: p,
        distance: getDistanceMeters(selectedLocation.lat, selectedLocation.lng, p.lat, p.lng),
      }))
      .filter((item) => item.distance <= 50)
      .sort((a, b) => a.distance - b.distance);
  }, [selectedLocation, validPlaces]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
  };

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
      <MapPanController selectedPlace={selectedPlace} externalPreview={externalPreview} />
      <MapResizeController />
      <UserLocationButton />
      <MapClickHandler onMapClick={handleMapClick} />

      {validPlaces.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        const icon = createMarkerIcon(place, isSelected, activeNeed);
        const meta = placeStatusMeta(place, activeNeed);

        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            title={`${place.name} — Kebutuhan ${activeNeed}: ${meta.label}`}
            icon={icon}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedLocation(null);
                onSelectPlace(place);
              },
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

      {selectedLocation && (
        <>
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            draggable={true}
            icon={createTemporaryMarkerIcon()}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                setSelectedLocation({
                  lat: Number(pos.lat.toFixed(6)),
                  lng: Number(pos.lng.toFixed(6)),
                });
              },
            }}
          />
          <Popup
            position={[selectedLocation.lat, selectedLocation.lng]}
            offset={[0, -36]}
            autoPan={true}
            closeButton={false}
            closeOnClick={false}
          >
            <div className="add-place-popup-card">
              <div className="add-place-header">
                <div className="add-place-icon" aria-hidden="true">
                  <Icon name="map-pin-plus" size={16} />
                </div>
                <h4 className="add-place-title">
                  {selectedLocation.name || 'Tambahkan tempat'}
                </h4>
                <button
                  type="button"
                  className="add-place-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLocation(null);
                    onClearExternalPreview?.();
                  }}
                  title="Tutup popup"
                  aria-label="Tutup popup"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
              {selectedLocation.address && (
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 6px', lineHeight: 1.3 }}>
                  {selectedLocation.address}
                </p>
              )}
              <p className="add-place-desc">
                {selectedLocation.name
                  ? 'Tempat ini belum terdata di Naviable. Jadilah orang pertama yang mendata aksesibilitasnya!'
                  : 'Tambahkan informasi kondisi akses di lokasi ini.'}
              </p>
              <div className="add-place-coords">
                <Icon name="map-pin" size={13} className="text-muted flex-shrink-0" />
                <span>
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </span>
              </div>

              {nearbyPlaces.length > 0 ? (
                <div className="popup-nearby-warning" role="alert">
                  <div className="nearby-warning-title">
                    <Icon name="info" size={14} />
                    <span>Tempat terdaftar di dekat sini:</span>
                  </div>
                  <span className="nearby-place-name">
                    {nearbyPlaces[0].place.name} (±{nearbyPlaces[0].distance}m)
                  </span>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'inherit' }}>
                    Lokasi ini mungkin sudah memiliki data. Periksa tempat ini sebelum menambahkan tempat baru.
                  </p>
                  <div className="popup-btn-row">
                    <button
                      type="button"
                      className="popup-btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const target = nearbyPlaces[0].place;
                        setSelectedLocation(null);
                        onClearExternalPreview?.();
                        onSelectPlace(target);
                      }}
                    >
                      Lihat Tempat
                    </button>
                    <button
                      type="button"
                      className="popup-btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddPlaceAtLocation?.(selectedLocation);
                      }}
                    >
                      Tetap Tambahkan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="popup-btn-row">
                  <button
                    type="button"
                    className="popup-btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLocation(null);
                      onClearExternalPreview?.();
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="popup-btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPlaceAtLocation?.(selectedLocation);
                    }}
                  >
                    {selectedLocation.name ? '➕ Tambah ke Naviable' : 'Tambahkan Tempat'}
                  </button>
                </div>
              )}
            </div>
          </Popup>
        </>
      )}
    </MapContainer>
  );
}
