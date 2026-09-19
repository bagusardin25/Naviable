'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Place, placeStatusMeta, getEvidenceFreshness, detectConditionChanges, STATUS_META, AccessibilityNeed } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { AccessibilityChain } from './AccessibilityChain';
import { CorrectionHistory } from './CorrectionHistory';
import { PlaceReviews } from './PlaceReviews';
import { fetchPlaceReports, type ApiReport } from '@/lib/api';

type PlaceDetailDrawerProps = {
  place: Place | null;
  onClose: () => void;
  onCorrectPlace: (place: Place) => void;
  onWriteReview: (place: Place) => void;
  signedIn: boolean;
  activeNeed?: AccessibilityNeed;
};

export function PlaceDetailDrawer({
  place,
  onClose,
  onCorrectPlace,
  onWriteReview,
  signedIn,
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
    if (!place) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
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
  }, [onClose, place]);

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

  const statusIcon =
    meta.status === 'UTUH'
      ? 'check-circle'
      : meta.status === 'TERHALANG'
      ? 'warning'
      : meta.status === 'TIDAK_STANDAR'
      ? 'alert-circle'
      : meta.status === 'TIDAK_ADA'
      ? 'x-circle'
      : 'help-circle';

  const freshnessIcon =
    freshness.level === 'fresh'
      ? 'check-circle'
      : freshness.level === 'aging'
      ? 'clock'
      : freshness.level === 'stale'
      ? 'history'
      : 'info';

  return (
    <section
      ref={drawerRef}
      className="detail-drawer"
      aria-label={`Detail kondisi akses ${place.name}`}
      role="dialog"
      aria-modal="true"
    >
      <button
        id="drawer-close-btn"
        className="drawer-close"
        onClick={onClose}
        aria-label="Tutup detail tempat"
        type="button"
      >
        <Icon name="close" />
      </button>

      <div className="detail-title">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span className="eyebrow">Profil {activeNeed}</span>
          <span className={`status-badge ${meta.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Icon name={statusIcon} size={11} />
            <span>{meta.label}</span>
          </span>
          <span className={`freshness-badge ${freshness.badgeClass}`} title={`Pembaruan: ${freshness.label}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Icon name={freshnessIcon} size={11} />
            <span>{freshness.label}</span>
          </span>
          {place.needsGeocoding ? (
            <span className="badge-needs-geocoding">Belum ada titik peta</span>
          ) : (
            <span className="badge-presurvey">{place.reportCount ? `${place.reportCount} laporan warga` : 'Belum diverifikasi'}</span>
          )}
        </div>

        <h2>{place.name}</h2>
        <span style={{ fontSize: '12px', color: '#576479', display: 'block', marginBottom: '4px' }}>
          {place.category} · Kec. {place.district} · {place.distance}
        </span>
        {place.address && <p className="detail-address">{place.address}</p>}
        <p className="detail-summary">{place.chainSummary}</p>
      </div>

      {conditionChanges.length > 0 && (
        <div role="status" className="drawer-history-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
            <Icon name="history" size={14} />
            <span>Riwayat pembaruan kondisi:</span>
          </div>
          {conditionChanges.map((change, idx) => (
            <div key={idx} style={{ marginTop: '4px', lineHeight: 1.5 }}>
              <strong>{change.elementLabel}</strong> diperbarui dari{' '}
              <span className="badge-status-change" style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px' }}>
                {STATUS_META[change.previousStatus].label}
              </span>{' '}
              →{' '}
              <span className="badge-status-change" style={{ background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px' }}>
                {STATUS_META[change.currentStatus].label}
              </span>{' '}
              oleh <em>{change.currentReporter}</em> ({new Date(change.currentDate).toLocaleDateString('id-ID')}).
            </div>
          ))}
        </div>
      )}

      {place.needsGeocoding && (
        <div className="geocoding-notice-box" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Icon name="warning" size={16} className="flex-shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <strong>Belum ada titik peta:</strong> Tempat ini tercatat di data publik, tetapi belum memiliki titik koordinat presisi. Data koordinat akan dilengkapi sebelum ditampilkan pada peta.
          </div>
        </div>
      )}

      {place.reportCount ? (
        <div className="presurvey-notice-box" role="note">
          <span style={{ flexShrink: 0, marginTop: '2px' }}>
            <Icon name="camera" size={18} />
          </span>
          <div>
            <strong>Laporan kondisi dari warga</strong>
            <div style={{ fontSize: '11.5px', marginTop: '3px', lineHeight: 1.5, opacity: 0.9 }}>
              Sudah ada {place.reportCount} laporan warga
              {place.coverage ? ` (${place.coverage.known} dari ${place.coverage.total} titik akses terkonfirmasi)` : ''}.
              {unknownElements > 0 ? ` Masih ada ${unknownElements} titik akses yang belum lengkap.` : ' Seluruh titik akses utama sudah memiliki bukti foto.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="presurvey-notice-box" role="note">
          <span style={{ flexShrink: 0, marginTop: '2px' }}>
            <Icon name="info" size={18} />
          </span>
          <div>
            <strong>Belum diverifikasi</strong>
            <div style={{ fontSize: '11.5px', marginTop: '3px', lineHeight: 1.5, opacity: 0.9 }}>
              Informasi awal dari data publik. Belum diverifikasi langsung di lapangan. Bantu laporkan kondisi sebenarnya dengan foto.
            </div>
          </div>
        </div>
      )}

      {place.features && place.features.length > 0 && (
        <div className="drawer-features-box">
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
            Fasilitas yang tercatat:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {place.features.map((feat, idx) => (
              <span key={idx} className="drawer-feature-tag">
                {feat}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="evidence-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
        <div>
          <span style={{ color: '#64748b' }}>Sumber:</span>{' '}
          <strong>{place.sourceName || 'Data publik'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Lisensi:</span>{' '}
          <strong>{place.sourceLicense || 'Terbuka'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Jenis bukti:</span>{' '}
          <span>{place.evidenceLevelLabel}</span>
        </div>
        <div>
          <span style={{ color: '#64748b' }}>Diambil:</span>{' '}
          <span>{place.retrievedAt || '2026-09-13'}</span>
        </div>
      </div>

      {place.sourceUrl && (
        <div style={{ margin: '8px 0', fontSize: '12px' }}>
          <a
            href={place.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6d45cc', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            Buka sumber asli ↗
          </a>
        </div>
      )}

      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '16px 0 8px', color: '#1e293b' }}>
        Kondisi akses
      </h3>
      <AccessibilityChain key={`chain-${place.id}`} elements={place.elements} />

      <CorrectionHistory
        reports={historySettled ? history.reports : []}
        total={historySettled ? history.total : 0}
        state={historyState}
        onRetry={() => setHistoryAttempt((value) => value + 1)}
      />

      <div className="journey-hint" role="note">
        <Icon name="route" />
        <div>
          <strong>Catatan perjalanan</strong>
          <span>
            Periksa akses dari halte atau titik transit ke pintu masuk hingga fasilitas utama. Naviable menandai titik akses yang masih terputus.
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
        Laporkan Perubahan
      </button>
      <p className="flow-help">Informasi tidak sesuai kondisi lapangan? Koreksi elemen aksesibilitas dengan bukti foto.{!signedIn && ' Masuk diperlukan untuk mengirim laporan.'}</p>
      <PlaceReviews key={String(place.id)} placeId={String(place.id)} onWrite={() => onWriteReview(place)} signedIn={signedIn} />
    </section>
  );
}
