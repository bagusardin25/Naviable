'use client';

import React, { useState, useMemo } from 'react';
import { exportEvidenceCsvUrl } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import type { Place } from '@/types';

export function EvidenceExportButton({ places }: { places: Place[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [district, setDistrict] = useState('all');
  const [category, setCategory] = useState('all');
  const [profile, setProfile] = useState('all');
  const [element, setElement] = useState('all');
  const [status, setStatus] = useState('all');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.district))).sort();
  }, [places]);

  const categories = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.category))).sort();
  }, [places]);

  async function handleDownload() {
    setPending(true);
    setError('');
    try {
      const url = exportEvidenceCsvUrl({
        kecamatan: district,
        category,
        profile,
        element,
        status,
      });

      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error('Ekspor belum tersedia atau filter menghasilkan 0 data.');
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      const profilePart = profile !== 'all' ? `-${profile}` : '';
      link.download = `naviable-evidence${profilePart}-${dateStr}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setIsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ekspor gagal');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        id="btn-export-csv"
        type="button"
        className="primary-action export"
        disabled={!places.length}
        onClick={() => setIsOpen(true)}
      >
        <Icon name="download" />
        <span>Export Evidence Pack (CSV)</span>
      </button>

      {isOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsOpen(false)}
        >
          <section
            className="a11y-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-export-title"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">Civic Observatory Export</span>
                <h2 id="csv-export-title" style={{ fontSize: '18px', margin: 0 }}>
                  Unduh Filtered Evidence Pack
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Filter data sebelum mengunduh agar data sesuai dengan kebutuhan advokasi, penelitian, atau audit.
                </p>
              </div>
              <button
                type="button"
                id="export-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup jendela ekspor"
              >
                <Icon name="close" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '14px 0' }}>
              <div>
                <label htmlFor="csv-filter-district" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Kecamatan
                </label>
                <select
                  id="csv-filter-district"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option value="all">Semua Kecamatan</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="csv-filter-category" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Kategori Fasilitas
                </label>
                <select
                  id="csv-filter-category"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="csv-filter-profile" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Profil Kebutuhan
                </label>
                <select
                  id="csv-filter-profile"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                >
                  <option value="all">Semua Profil (Seluruh Elemen Rantai)</option>
                  <option value="mobilitas">Mobilitas</option>
                  <option value="visual">Visual</option>
                  <option value="auditori">Auditori</option>
                  <option value="sensorik">Sensorik</option>
                </select>
              </div>

              <div>
                <label htmlFor="csv-filter-element" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Elemen Spesifik
                </label>
                <select
                  id="csv-filter-element"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={element}
                  onChange={(e) => setElement(e.target.value)}
                >
                  <option value="all">Semua Elemen</option>
                  <option value="E1_door">E1 - Pintu / Akses Masuk</option>
                  <option value="E2_ramp">E2 - Ramp</option>
                  <option value="E3_toilet">E3 - Toilet Aksesibel</option>
                  <option value="E4_lift">E4 - Lift</option>
                  <option value="E5_guiding_block">E5 - Jalur Pemandu (Tactile)</option>
                  <option value="E6_parking">E6 - Parkir Disabilitas</option>
                  <option value="E7_signage">E7 - Signage & Informasi</option>
                  <option value="E8_crossing">E8 - Penyeberangan Aksesibel</option>
                </select>
              </div>

              <div>
                <label htmlFor="csv-filter-status" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Status Elemen
                </label>
                <select
                  id="csv-filter-status"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="UTUH">UTUH (Dapat Dipakai Mandiri)</option>
                  <option value="TERHALANG">TERHALANG (Ada tapi Terhalang)</option>
                  <option value="TIDAK_STANDAR">TIDAK STANDAR (Perlu Perbaikan)</option>
                  <option value="TIDAK_ADA">TIDAK ADA (Belum Tersedia)</option>
                  <option value="BELUM_DIKETAHUI">BELUM DIKETAHUI (Belum Disurvei)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#475569',
                lineHeight: 1.4,
              }}
            >
              🛡️ <strong>Keamanan Formula Injection:</strong> Output CSV terproteksi dari eksekusi rumus spreadsheet otomatis sesuai standar keamanan siber OWASP.
            </div>

            {error && (
              <div role="alert" style={{ color: '#dc2626', fontSize: '11px', marginTop: '8px' }}>
                {error}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setIsOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={pending}
                onClick={handleDownload}
              >
                <Icon name="download" />
                <span>{pending ? 'Mempersiapkan CSV…' : 'Unduh CSV'}</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
