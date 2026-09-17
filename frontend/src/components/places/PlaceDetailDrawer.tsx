'use client';

import React, { useEffect } from 'react';
import { Place, WHEELCHAIR_STATUS_META } from '@/types';
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

  const meta = WHEELCHAIR_STATUS_META[place.wheelchairStatus] || WHEELCHAIR_STATUS_META.unknown;

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
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span className="eyebrow">Rantai akses</span>
          <span className={`status-badge ${meta.badgeClass}`}>
            <strong>{meta.symbol}</strong> {meta.label}
          </span>
          {place.needsGeocoding ? (
            <span className="badge-needs-geocoding">Perlu Geocoding</span>
          ) : (
            <span className="badge-presurvey">PRE-SURVEY</span>
          )}
        </div>

        <h2>{place.name}</h2>
        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
          {place.category} · Kec. {place.district} · {place.distance}
        </span>
        {place.address && <p className="detail-address">{place.address}</p>}
        <p className="detail-summary">{place.chainSummary}</p>
      </div>

      {place.needsGeocoding && (
        <div className="geocoding-notice-box" role="alert">
          <strong>⚠️ Belum Memiliki Koordinat Presisi:</strong> Lokasi ini tercantum dalam dataset awal tetapi belum memiliki titik koordinat GPS. Gunakan menu Koreksi untuk melengkapi titik lokasi.
        </div>
      )}

      <div className="presurvey-notice-box" role="note">
        <span style={{ fontSize: '16px' }}>ℹ️</span>
        <div>
          <strong>Status Pre-Survey (Belum Terverifikasi Lapangan)</strong>
          <div style={{ fontSize: '10px', marginTop: '2px', color: '#15803d' }}>
            Data ini bersumber dari indikasi publik dan belum diaudit langsung oleh tim Naviable. Kontribusi bukti foto diperlukan untuk verifikasi mandiri.
          </div>
        </div>
      </div>

      {place.features && place.features.length > 0 && (
        <div style={{ margin: '12px 0', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
            Fitur Aksesibilitas Tercatat di Data Awal:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {place.features.map((feat, idx) => (
              <span key={idx} style={{ background: '#e2e8f0', color: '#1e293b', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                {feat}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="evidence-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
        <div>
          <span style={{ color: '#64748b' }}>Sumber:</span>{' '}
          <strong>{place.sourceName || 'OpenStreetMap'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Lisensi:</span>{' '}
          <strong>{place.sourceLicense || 'ODbL 1.0'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Tingkat Bukti:</span>{' '}
          <span>{place.evidenceLevelLabel}</span>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Diambil:</span>{' '}
          <span>{place.retrievedAt || '2026-09-13'}</span>
        </div>
      </div>

      {place.sourceUrl && (
        <div style={{ margin: '8px 0', fontSize: '11px' }}>
          <a
            href={place.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6d45cc', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            Buka Catatan Sumber Asli ↗
          </a>
        </div>
      )}

      <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '16px 0 8px', color: '#1e293b' }}>
        Kondisi 8 Rantai Aksesibilitas
      </h3>
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
