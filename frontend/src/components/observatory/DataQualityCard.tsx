'use client';

import React from 'react';
import { Place } from '@/types';

type DataQualityCardProps = {
  places: Place[];
};

export function DataQualityCard({ places }: DataQualityCardProps) {
  const total = places.length;
  const geocoded = places.filter((p) => !p.needsGeocoding && p.lat !== null && p.lng !== null).length;
  const needsGeocoding = places.filter((p) => p.needsGeocoding || p.lat === null || p.lng === null).length;
  const percentage = total > 0 ? Math.round((geocoded / total) * 100) : 0;

  return (
    <div
      className="card"
      style={{ marginTop: '16px', padding: '16px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
      aria-label="Kualitas data dan kelengkapan spasial"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div>
          <span className="eyebrow">Tata Kelola Data Spasial</span>
          <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '2px 0 4px', color: '#1e293b' }}>
            Kualitas Data & Kelengkapan Spasial
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Audit akurasi titik geolokasi terhadap dataset fasilitas publik Kota Surabaya.
          </p>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            background: percentage >= 80 ? '#dcfce7' : '#fef3c7',
            color: percentage >= 80 ? '#166534' : '#92400e',
          }}
        >
          {percentage}% Koordinat Lengkap
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Titik GPS Terverifikasi</span>
          <strong style={{ fontSize: '18px', color: '#16a34a' }}>{geocoded}</strong>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Siap ditampilkan pada peta OSM</span>
        </div>

        <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
          <span style={{ fontSize: '11px', color: '#92400e', display: 'block' }}>Perlu Geocoding Lapangan</span>
          <strong style={{ fontSize: '18px', color: '#d97706' }}>{needsGeocoding}</strong>
          <span style={{ fontSize: '10px', color: '#92400e', display: 'block' }}>Tercatat di data awal tanpa GPS presisi</span>
        </div>

        <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#475569', display: 'block' }}>Total Fasilitas Tercatat</span>
          <strong style={{ fontSize: '18px', color: '#0f172a' }}>{total}</strong>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Fasilitas publik dalam observatorium</span>
        </div>
      </div>

      <div
        role="note"
        style={{
          background: '#f8fafc',
          borderLeft: '4px solid #3b82f6',
          padding: '10px 14px',
          borderRadius: '0 8px 8px 0',
          fontSize: '11px',
          color: '#334155',
          lineHeight: 1.5,
        }}
      >
        <strong>Prinsip Inklusi Data Spasial:</strong> Fasilitas publik tanpa koordinat presisi sengaja tidak dihapus dari platform. Mempertahankan fasilitas tersebut memastikan tidak terjadi diskriminasi pencatatan terhadap ruang-ruang publik di luar koridor komersial utama yang belum terpetakan di OpenStreetMap.
      </div>
    </div>
  );
}
