'use client';

import React, { useEffect } from 'react';
import { Place } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { AccessibilityChain } from './AccessibilityChain';

type PlaceDetailDrawerProps = {
  place: Place | null;
  onClose: () => void;
  onCorrectPlace: (place: Place) => void;
};

export function PlaceDetailDrawer({
  place,
  onClose,
  onCorrectPlace,
}: PlaceDetailDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!place) return null;

  return (
    <section
      className="detail-drawer"
      aria-label={`Detail aksesibilitas ${place.name}`}
      role="region"
    >
      <button
        id="drawer-close-btn"
        className="drawer-close"
        onClick={onClose}
        aria-label="Tutup detail lokasi"
        type="button"
      >
        <Icon name="close" />
      </button>

      <div className="detail-title">
        <span className="eyebrow">Rantai akses</span>
        <h2>{place.name}</h2>
        {place.address && <p className="detail-address">{place.address}</p>}
        <p className="detail-summary">{place.chainSummary}</p>
      </div>

      <div className="evidence-meta">
        <span>
          <Icon name="photo" size={16} />
          {place.photos} foto bukti komunitas
        </span>
        <span>Diperbarui {place.updated}</span>
      </div>

      <AccessibilityChain elements={place.elements} />

      <div className="journey-hint" role="note">
        <Icon name="route" />
        <div>
          <strong>Journey Hint</strong>
          <span>
            Halte terdekat → akses masuk → fasilitas inti. Naviable menandai titik putus rantai akses; bukan sistem navigasi GPS router.
          </span>
        </div>
      </div>

      <button
        id="btn-correct-place"
        className="secondary-action"
        style={{ width: '100%', marginTop: '14px' }}
        onClick={() => onCorrectPlace(place)}
        type="button"
      >
        Koreksi dengan bukti baru
      </button>
    </section>
  );
}
