'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Place, placeStatusMeta, getEvidenceFreshness, detectConditionChanges, STATUS_META, AccessibilityNeed } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { AccessibilityChain } from './AccessibilityChain';
import { CorrectionHistory } from './CorrectionHistory';
import { fetchPlaceReports, type ApiReport } from '@/lib/api';

type PlaceDetailDrawerProps = {
  place: Place | null;
  onClose: () => void;
  onCorrectPlace: (place: Place) => void;
  activeNeed?: AccessibilityNeed;
};

export function PlaceDetailDrawer({
  place,
  onClose,
  onCorrectPlace,
  activeNeed = 'Mobilitas',
}: PlaceDetailDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus trap & focus restoration
  useEffect(() => {
    if (place) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      // Focus close button after drawer renders
      setTimeout(() => {
        const closeBtn = document.getElementById('drawer-close-btn');
        closeBtn?.focus();
      }, 50);
    }
    return () => {
      // Restore focus to previous trigger
      previouslyFocusedRef.current?.focus();
    };
  }, [place]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const placeId = place ? String(place.id) : null;
  const reportCount = place?.reportCount ?? 0;
  const [history, setHistory] = useState<{ key: string; error: boolean; reports: ApiReport[]; total: number } | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);

  // Loaded per place, and refreshed when a new report lands so a correction appears
  // immediately instead of only after a full page reload.
  useEffect(() => {
    if (placeId === null) return;
    let active = true;
    const key = `${placeId}:${reportCount}:${historyAttempt}`;
    fetchPlaceReports(placeId)
      .then((page) => {
        if (active) setHistory({ key, error: false, reports: page.reports, total: page.total });
      })
      .catch(() => {
        if (active) setHistory({ key, error: true, reports: [], total: 0 });
      });
    return () => {
      active = false;
    };
  }, [placeId, reportCount, historyAttempt]);

  const historyKey = `${placeId}:${reportCount}:${historyAttempt}`;
  const historySettled = history?.key === historyKey;
  const historyState: 'idle' | 'loading' | 'error' = !historySettled ? 'loading' : history.error ? 'error' : 'idle';

  if (!place) return null;

  const meta = placeStatusMeta(place, activeNeed);
  const freshness = getEvidenceFreshness(place.updatedAt);
  const conditionChanges = detectConditionChanges(historySettled ? history.reports : []);
  const unknownElements = place.elements.filter((element) => element.status === 'BELUM_DIKETAHUI').length;

  return (
    <section
      ref={drawerRef}
      className="detail-drawer"
      aria-label={`Detail aksesibilitas ${place.name}`}
      role="dialog"
      aria-modal="true"
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
          <span className="eyebrow">Profil {activeNeed}</span>
          <span className={`status-badge ${meta.badgeClass}`}>
            <strong>{meta.symbol}</strong> {meta.label}
          </span>
          <span className={`freshness-badge ${freshness.badgeClass}`} title={`Kesegaran data: ${freshness.label}`}>
            {freshness.symbol} {freshness.label}
          </span>
          {place.needsGeocoding ? (
            <span className="badge-needs-geocoding">Perlu Geocoding</span>
          ) : (
            <span className="badge-presurvey">{place.reportCount ? `${place.reportCount} LAPORAN` : 'PRE-SURVEY'}</span>
          )}
        </div>

        <h2>{place.name}</h2>
        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
          {place.category} · Kec. {place.district} · {place.distance}
        </span>
        {place.address && <p className="detail-address">{place.address}</p>}
        <p className="detail-summary">{place.chainSummary}</p>
      </div>

      {conditionChanges.length > 0 && (
        <div
          role="status"
          style={{
            margin: '10px 0',
            padding: '10px 14px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            fontSize: '11px',
            color: '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '4px' }}>
            <span>🔄</span>
            <span>Perubahan Kondisi Terverifikasi (Immutable Trail):</span>
          </div>
          {conditionChanges.map((change, idx) => (
            <div key={idx} style={{ marginTop: '4px', lineHeight: 1.4 }}>
              <strong>{change.elementLabel}</strong> diperbarui dari{' '}
              <span className="badge-status-change" style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>
                {STATUS_META[change.previousStatus].label}
              </span>{' '}
              ➔{' '}
              <span className="badge-status-change" style={{ background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px' }}>
                {STATUS_META[change.currentStatus].label}
              </span>{' '}
              oleh <em>{change.currentReporter}</em> ({new Date(change.currentDate).toLocaleDateString('id-ID')}).
            </div>
          ))}
        </div>
      )}


      {place.needsGeocoding && (
        <div className="geocoding-notice-box" role="alert">
          <strong>⚠️ Belum Memiliki Koordinat Presisi:</strong> Lokasi ini tercantum dalam dataset awal tetapi belum memiliki titik koordinat GPS. Koordinat perlu dilengkapi oleh pengelola dataset sebelum ditampilkan pada peta.
        </div>
      )}

      {place.reportCount ? (
        <div className="presurvey-notice-box" role="note">
          <span style={{ fontSize: '16px' }}>📷</span>
          <div>
            <strong>Bukti lapangan dari kontributor</strong>
            <div style={{ fontSize: '10px', marginTop: '2px', color: '#15803d' }}>
              Sudah ada {place.reportCount} laporan warga
              {place.coverage ? `; ${place.coverage.known} dari ${place.coverage.total} elemen relevan punya status terkonfirmasi` : ''}.
              {' '}Status elemen di bawah berasal dari konfirmasi kontributor dan menggantikan indikasi pra-survei pada elemen yang sudah dikunci.
              {unknownElements > 0 ? ` ${unknownElements} elemen masih belum diketahui dan menunggu bukti foto.` : ' Seluruh elemen relevan sudah punya bukti.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="presurvey-notice-box" role="note">
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <div>
            <strong>Status Pre-Survey (Belum Terverifikasi Lapangan)</strong>
            <div style={{ fontSize: '10px', marginTop: '2px', color: '#15803d' }}>
              Data ini bersumber dari indikasi publik dan belum diaudit langsung oleh tim Naviable. Kontribusi bukti foto diperlukan untuk verifikasi mandiri.
            </div>
          </div>
        </div>
      )}

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
          <strong>{place.sourceLicense || 'Tidak dicantumkan'}</strong>
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

      <CorrectionHistory
        reports={historySettled ? history.reports : []}
        total={historySettled ? history.total : 0}
        state={historyState}
        onRetry={() => setHistoryAttempt((value) => value + 1)}
      />

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
