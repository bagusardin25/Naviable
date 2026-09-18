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
      aria-label="Kelengkapan data lokasi"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div>
          <span className="eyebrow">Kelengkapan Data</span>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 4px', color: '#1e293b' }}>
            Kelengkapan Titik di Peta
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Perbandingan tempat yang sudah memiliki koordinat peta dengan tempat yang masih butuh penandaan lokasi.
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
          {percentage}% Sudah Ada Titik Peta
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Titik Peta Tersedia</span>
          <strong style={{ fontSize: '18px', color: '#16a34a' }}>{geocoded}</strong>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Bisa dilihat langsung di peta</span>
        </div>

        <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
          <span style={{ fontSize: '11px', color: '#92400e', display: 'block' }}>Belum Ada Titik Peta</span>
          <strong style={{ fontSize: '18px', color: '#d97706' }}>{needsGeocoding}</strong>
          <span style={{ fontSize: '10px', color: '#92400e', display: 'block' }}>Masih butuh bantuan penandaan lokasi</span>
        </div>

        <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#475569', display: 'block' }}>Total Tempat Terdata</span>
          <strong style={{ fontSize: '18px', color: '#0f172a' }}>{total}</strong>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Fasilitas publik yang tercatat</span>
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
        <strong>Mengapa semua tempat tetap dicatat?</strong> Tempat yang belum memiliki titik peta tetap kami tampilkan agar tidak terlewatkan. Relawan dapat membantu menambahkan lokasi saat survei ke lapangan.
      </div>
    </div>
  );
}
