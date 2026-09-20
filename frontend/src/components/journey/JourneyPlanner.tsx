'use client';

import React, { useState } from 'react';
import { Place, AccessibilityNeed, JourneyResponse, STATUS_META, CHAIN_ELEMENT_MAP, ChainElementCode } from '@/types';
import { fetchJourney } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { buildGoogleMapsRouteUrl, buildGoogleMapsPlaceUrl, TravelMode } from '@/lib/externalMaps';

type JourneyPlannerProps = {
  places: Place[];
  currentNeed: AccessibilityNeed;
  onSelectPlace: (place: Place) => void;
  onClose: () => void;
};

export function JourneyPlanner({
  places,
  currentNeed,
  onSelectPlace,
  onClose,
}: JourneyPlannerProps) {
  // Only places with coordinates are eligible for journey origin/destination
  const geocodedPlaces = places.filter((p) => !p.needsGeocoding && p.lat !== null && p.lng !== null);

  const [originId, setOriginId] = useState<string>(geocodedPlaces[0] ? String(geocodedPlaces[0].id) : '');
  const [destinationId, setDestinationId] = useState<string>(
    geocodedPlaces[1] ? String(geocodedPlaces[1].id) : ''
  );
  const [profile, setProfile] = useState<AccessibilityNeed>(currentNeed);
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [loading, setLoading] = useState(false);
  const [journey, setJourney] = useState<JourneyResponse | null>(null);
  const [error, setError] = useState('');

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!originId || !destinationId) {
      setError('Pilih lokasi asal dan tujuan terlebih dahulu.');
      return;
    }
    if (originId === destinationId) {
      setError('Lokasi asal dan tujuan harus berbeda.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetchJourney(originId, destinationId, profile.toLowerCase());
      setJourney(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rantai perjalanan');
    } finally {
      setLoading(false);
    }
  }

  function getElementLabel(elementKey: string): string {
    const code = elementKey.split('_')[0] as ChainElementCode;
    return CHAIN_ELEMENT_MAP[code]?.label ?? elementKey;
  }

  return (
    <div className="journey-planner-panel" role="region" aria-label="Petunjuk rute akses">
      <div className="journey-planner-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="route" />
          <h2 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#1e293b' }}>
            Petunjuk Rute Akses
          </h2>
        </div>
        <button
          type="button"
          className="drawer-close"
          onClick={onClose}
          aria-label="Tutup petunjuk rute"
          style={{ position: 'static' }}
        >
          <Icon name="close" />
        </button>
      </div>

      <div
        className="journey-disclaimer-card"
        role="note"
        style={{
          background: 'var(--notice-warning-bg)',
          border: '1px solid var(--notice-warning-border)',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'var(--notice-warning-ink)',
          margin: '10px 0',
          lineHeight: 1.45,
        }}
      >
        <strong>Catatan:</strong> Fitur ini merangkum titik akses penting di rute yang kamu tuju,{' '}
        <strong>bukan navigasi belokan jalan raya (GPS)</strong>.
        Kondisi trotoar penghubung masih terus diverifikasi bersama warga.
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label
            htmlFor="journey-origin-select"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}
          >
            <Icon name="location" size={13} />
            <span>Titik Awal</span>
          </label>
          <select
            id="journey-origin-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
          >
            <option value="" disabled>Pilih lokasi keberangkatan…</option>
            {geocodedPlaces.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.district})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="journey-dest-select"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}
          >
            <Icon name="compass" size={13} />
            <span>Titik Tujuan</span>
          </label>
          <select
            id="journey-dest-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
          >
            <option value="" disabled>Pilih tempat tujuan…</option>
            {geocodedPlaces.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.district})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="journey-profile-select"
            style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}
          >
            Profil Aksesibilitas
          </label>
          <select
            id="journey-profile-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={profile}
            onChange={(e) => setProfile(e.target.value as AccessibilityNeed)}
          >
            <option value="Mobilitas">Kursi Roda / Motorik</option>
            <option value="Visual">Tunanetra / Gangguan Penglihatan</option>
            <option value="Auditori">Tunarungu / Gangguan Pendengaran</option>
            <option value="Sensorik">Sensitivitas Sensorik</option>
          </select>
        </div>

        <button
          type="submit"
          className="primary-action"
          style={{ marginTop: '6px', justifyContent: 'center' }}
          disabled={loading || !originId || !destinationId}
        >
          {loading ? 'Memeriksa rute…' : 'Cek Rute Akses'}
        </button>

        {error && (
          <div role="alert" style={{ color: 'var(--notice-error-ink)', fontSize: '11px', background: 'var(--notice-error-bg)', border: '1px solid var(--notice-error-border)', padding: '8px 10px', borderRadius: '6px' }}>
            {error}
          </div>
        )}
      </form>

      {journey && (
        <div className="journey-results" style={{ marginTop: '16px' }}>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: journey.hasBottlenecks ? 'var(--notice-error-bg)' : 'var(--notice-success-bg)',
              border: `1px solid ${journey.hasBottlenecks ? 'var(--notice-error-border)' : 'var(--notice-success-border)'}`,
              marginBottom: '12px',
            }}
          >
            <strong style={{ fontSize: '12px', color: journey.hasBottlenecks ? 'var(--notice-error-ink)' : 'var(--notice-success-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {journey.hasBottlenecks ? (
                <>
                  <Icon name="warning" size={15} />
                  <span>Perhatian: Ditemukan {journey.bottleneckCount} titik yang dilaporkan bermasalah di rute ini.</span>
                </>
              ) : (
                <>
                  <Icon name="check-circle" size={15} />
                  <span>Semua titik yang tercatat di rute ini dilaporkan bisa digunakan.</span>
                </>
              )}
            </strong>
            <span style={{ fontSize: '11px', color: journey.hasBottlenecks ? 'var(--notice-error-ink)' : 'var(--notice-success-ink)', display: 'block', marginTop: '2px', opacity: 0.9 }}>
              Dicek untuk kebutuhan: <strong>{profile}</strong>.
            </span>
          </div>

          {(() => {
            const originPoint = journey.points[0];
            const destPoint = journey.points[journey.points.length - 1];
            const waypoints = journey.points.slice(1, -1);
            const googleMapsRouteUrl =
              originPoint && destPoint
                ? buildGoogleMapsRouteUrl({
                    origin: originPoint,
                    destination: destPoint,
                    waypoints,
                    travelMode,
                  })
                : null;

            return googleMapsRouteUrl ? (
              <div className="google-maps-card" role="region" aria-label="Navigasi langsung Google Maps">
                <div className="google-maps-card-header">
                  <span className="google-maps-card-title">
                    <Icon name="navigation" size={15} />
                    <span>Navigasi Langsung (Google Maps)</span>
                  </span>
                  <div className="google-maps-mode-pills" role="group" aria-label="Pilih moda perjalanan">
                    <button
                      type="button"
                      className={`google-maps-mode-btn ${travelMode === 'walking' ? 'active' : ''}`}
                      onClick={() => setTravelMode('walking')}
                      aria-pressed={travelMode === 'walking'}
                    >
                      Jalan Kaki
                    </button>
                    <button
                      type="button"
                      className={`google-maps-mode-btn ${travelMode === 'transit' ? 'active' : ''}`}
                      onClick={() => setTravelMode('transit')}
                      aria-pressed={travelMode === 'transit'}
                    >
                      Angkutan Umum
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.45 }}>
                  Buka navigasi belokan jalan raya (turn-by-turn) di Google Maps dari{' '}
                  <strong>{originPoint?.name}</strong> menuju <strong>{destPoint?.name}</strong>
                  {waypoints.length > 0 ? ` melalui ${waypoints.length} titik transit.` : '.'}
                </p>
                <a
                  href={googleMapsRouteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-maps-btn"
                  aria-label={`Buka panduan rute ${originPoint?.name} ke ${destPoint?.name} di Google Maps (membuka tab baru)`}
                >
                  <Icon name="navigation" size={14} />
                  <span>Buka Rute di Google Maps</span>
                  <Icon name="external-link" size={13} />
                </a>
              </div>
            ) : null;
          })()}

          <ol className="journey-points-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {journey.points.map((pt, idx) => {
              const fullPlace = places.find((p) => String(p.id) === String(pt.id));
              const isOrigin = idx === 0;
              const isDestination = idx === journey.points.length - 1;
              const stepLabel = isOrigin ? '1. Titik Awal' : isDestination ? `${journey.points.length}. Titik Tujuan` : `${idx + 1}. Titik Transit`;
              const statusMeta = STATUS_META[pt.overall] ?? STATUS_META.BELUM_DIKETAHUI;
              const statusIcon = pt.overall === 'UTUH' ? 'check-circle' : pt.overall === 'TERHALANG' ? 'warning' : pt.overall === 'TIDAK_STANDAR' ? 'alert-circle' : pt.overall === 'TIDAK_ADA' ? 'x-circle' : 'help-circle';
              const pointNavUrl =
                pt.lat !== null && pt.lng !== null
                  ? buildGoogleMapsPlaceUrl({ destination: pt, travelMode })
                  : null;

              return (
                <li
                  key={pt.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '8px',
                    background: 'var(--surface-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--purple)' }}>
                        {stepLabel}
                      </span>
                      <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>
                        {pt.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {pt.category} · {pt.kecamatan ?? 'Surabaya'}
                      </span>
                    </div>
                    <span
                      className={`status-badge status-${pt.overall.toLowerCase()}`}
                      style={{ fontSize: '10px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Icon name={statusIcon} size={12} />
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {pt.bottlenecks && pt.bottlenecks.length > 0 && (
                    <div style={{ margin: '6px 0', fontSize: '11px', color: 'var(--notice-error-ink)', background: 'var(--notice-error-bg)', border: '1px solid var(--notice-error-border)', padding: '4px 8px', borderRadius: '4px' }}>
                      <strong>Akses bermasalah:</strong>{' '}
                      {pt.bottlenecks.map(getElementLabel).join(', ')}
                    </div>
                  )}

                  <p style={{ margin: '6px 0 8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {pt.summary}
                  </p>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {fullPlace && (
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ fontSize: '11px', padding: '6px 10px', flex: '1 1 auto', justifyContent: 'center' }}
                        onClick={() => onSelectPlace(fullPlace)}
                      >
                        Lihat detail tempat ↗
                      </button>
                    )}
                    {pointNavUrl && (
                      <a
                        href={pointNavUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="google-maps-btn-secondary"
                        style={{ fontSize: '11px', padding: '6px 10px', flex: '1 1 auto', justifyContent: 'center' }}
                        aria-label={`Buka arah ke ${pt.name} di Google Maps (membuka tab baru)`}
                      >
                        <Icon name="navigation" size={12} />
                        <span>Arahkan ke sini</span>
                        <Icon name="external-link" size={11} />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
