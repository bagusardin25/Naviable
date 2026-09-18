'use client';

import React, { useState } from 'react';
import { Place, AccessibilityNeed, JourneyResponse, STATUS_META, CHAIN_ELEMENT_MAP, ChainElementCode } from '@/types';
import { fetchJourney } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

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
          background: '#fffbeb',
          border: '1px solid #fde68a',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#92400e',
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
            style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}
          >
            📍 Titik Awal
          </label>
          <select
            id="journey-origin-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            required
          >
            <option value="" disabled>Pilih titik awal...</option>
            {geocodedPlaces.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name} ({p.district})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="journey-destination-select"
            style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}
          >
            🏁 Titik Tujuan
          </label>
          <select
            id="journey-destination-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            required
          >
            <option value="" disabled>Pilih titik tujuan...</option>
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
            style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}
          >
            ♿ Kebutuhan Akses
          </label>
          <select
            id="journey-profile-select"
            className="filter-select"
            style={{ width: '100%' }}
            value={profile}
            onChange={(e) => setProfile(e.target.value as AccessibilityNeed)}
          >
            <option value="Mobilitas">Kursi roda / mobilitas fisik</option>
            <option value="Visual">Tunanetra (jalur pemandu & tactile)</option>
            <option value="Auditori">Tunarungu / komunikasi visual</option>
            <option value="Sensorik">Sensori & ketenangan</option>
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
          <div role="alert" style={{ color: '#dc2626', fontSize: '11px', background: '#fef2f2', padding: '8px 10px', borderRadius: '6px' }}>
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
              background: journey.hasBottlenecks ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${journey.hasBottlenecks ? '#fca5a5' : '#bbf7d0'}`,
              marginBottom: '12px',
            }}
          >
            <strong style={{ fontSize: '12px', color: journey.hasBottlenecks ? '#991b1b' : '#166534', display: 'block' }}>
              {journey.hasBottlenecks
                ? `Perhatian: Ditemukan ${journey.bottleneckCount} titik yang dilaporkan bermasalah di rute ini.`
                : 'Semua titik yang tercatat di rute ini dilaporkan bisa digunakan.'}
            </strong>
            <span style={{ fontSize: '11px', color: journey.hasBottlenecks ? '#b91c1c' : '#15803d', display: 'block', marginTop: '2px' }}>
              Dicek untuk kebutuhan: <strong>{profile}</strong>.
            </span>
          </div>

          <ol className="journey-points-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {journey.points.map((pt, idx) => {
              const fullPlace = places.find((p) => String(p.id) === String(pt.id));
              const isOrigin = idx === 0;
              const isDestination = idx === journey.points.length - 1;
              const stepLabel = isOrigin ? '1. Titik Awal' : isDestination ? `${journey.points.length}. Titik Tujuan` : `${idx + 1}. Titik Transit`;
              const statusMeta = STATUS_META[pt.overall] ?? STATUS_META.BELUM_DIKETAHUI;

              return (
                <li
                  key={pt.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '8px',
                    background: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#6d45cc' }}>
                        {stepLabel}
                      </span>
                      <strong style={{ fontSize: '13px', display: 'block', color: '#1e293b' }}>
                        {pt.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {pt.category} · {pt.kecamatan ?? 'Surabaya'}
                      </span>
                    </div>
                    <span
                      className={`status-badge status-${pt.overall.toLowerCase()}`}
                      style={{ fontSize: '10px', whiteSpace: 'nowrap' }}
                    >
                      {statusMeta.symbol} {statusMeta.label}
                    </span>
                  </div>

                  {pt.bottlenecks && pt.bottlenecks.length > 0 && (
                    <div style={{ margin: '6px 0', fontSize: '11px', color: '#b91c1c', background: '#fff1f2', padding: '4px 8px', borderRadius: '4px' }}>
                      <strong>Akses bermasalah:</strong>{' '}
                      {pt.bottlenecks.map(getElementLabel).join(', ')}
                    </div>
                  )}

                  <p style={{ margin: '6px 0 8px', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                    {pt.summary}
                  </p>

                  {fullPlace && (
                    <button
                      type="button"
                      className="secondary-action"
                      style={{ fontSize: '11px', padding: '4px 8px', width: '100%', justifyContent: 'center' }}
                      onClick={() => onSelectPlace(fullPlace)}
                    >
                      Lihat detail tempat ini ↗
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
