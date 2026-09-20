import React from 'react';
import { Place, AccessibilityNeed } from '@/types';
import type { ExternalPlaceResult } from '@/lib/externalGeocoding';
import { PlaceCard } from './PlaceCard';
import { Icon } from '@/components/ui/Icon';

type PlaceListProps = {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  className?: string;
  activeNeed?: AccessibilityNeed;
  searchQuery?: string;
  externalPlaces?: ExternalPlaceResult[];
  externalLoading?: boolean;
  onAddExternalPlace?: (place: ExternalPlaceResult) => void;
  onViewExternalPlace?: (place: ExternalPlaceResult) => void;
};

export function PlaceList({
  places,
  selectedPlace,
  onSelectPlace,
  className = '',
  activeNeed = 'Mobilitas',
  searchQuery = '',
  externalPlaces = [],
  externalLoading = false,
  onAddExternalPlace,
  onViewExternalPlace,
}: PlaceListProps) {
  const geocodedCount = places.filter((p) => !p.needsGeocoding).length;
  const unlocatedCount = places.filter((p) => p.needsGeocoding).length;

  const unrecordedExternal = externalPlaces.filter((ext) => !ext.isExistingInNaviable);

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
          externalLoading ? (
            <div className="empty-places" style={{ padding: '36px 16px', textAlign: 'center' }}>
              <div
                className="map-spinner"
                style={{ margin: '0 auto 12px', width: '28px', height: '28px', borderTopColor: 'var(--navy)' }}
              />
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
                Mencari lokasi di OpenStreetMap...
              </p>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                Mengecek ketersediaan titik umum di Surabaya untuk &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : unrecordedExternal.length > 0 ? (
            <div className="external-suggestion-container">
              <div className="external-suggestion-header">
                <span className="external-badge-unrecorded">Belum Terdata di Naviable</span>
                <h3>Ditemukan di Peta Surabaya</h3>
                <p>
                  Tempat publik ini belum memiliki data aksesibilitas. Jadilah orang pertama yang mendatanya!
                </p>
              </div>

              <div className="external-cards-list">
                {unrecordedExternal.map((ext) => (
                  <div key={ext.id} className="external-place-card">
                    <div className="external-place-header-row">
                      <span className="external-category-pill">{ext.category}</span>
                      <span className="external-source-pill">OpenStreetMap</span>
                    </div>
                    <h4 className="external-place-name">{ext.name}</h4>
                    <p className="external-place-address">{ext.address}</p>

                    <div className="external-place-actions">
                      <button
                        type="button"
                        className="btn-external-view"
                        onClick={() => onViewExternalPlace?.(ext)}
                        title="Lihat titik di peta"
                      >
                        <Icon name="map-pin" size={13} />
                        <span>Lihat Titik</span>
                      </button>
                      <button
                        type="button"
                        className="btn-external-add"
                        onClick={() => onAddExternalPlace?.(ext)}
                        title="Tambah tempat baru ke Naviable"
                      >
                        <Icon name="plus" size={13} />
                        <span>Tambah ke Naviable</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-places" style={{ padding: '36px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
                Belum ada tempat yang cocok
              </p>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                Coba gunakan nama tempat lain, atau klik sembarang titik pada peta untuk menambahkan tempat baru.
              </p>
            </div>
          )
        ) : (
          <>
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isSelected={selectedPlace?.id === place.id}
                onSelect={() => onSelectPlace(place)}
                activeNeed={activeNeed}
              />
            ))}

            {/* If local results exist, but there's also an unrecorded external POI match */}
            {unrecordedExternal.length > 0 && searchQuery.trim().length >= 3 && (
              <div className="external-bottom-suggestion">
                <div className="external-bottom-text">
                  <span className="external-badge-unrecorded">Tempat Publik Lain</span>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    {unrecordedExternal[0].name} ({unrecordedExternal[0].category}) belum terdata di Naviable
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-external-add"
                  style={{ fontSize: '11px', padding: '6px 10px', marginTop: '6px' }}
                  onClick={() => onAddExternalPlace?.(unrecordedExternal[0])}
                >
                  <Icon name="plus" size={12} />
                  <span>➕ Tambah Tempat Ini</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
