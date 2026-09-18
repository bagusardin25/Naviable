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
      style={{ marginTop: '16px', padding: '16px 20px' }}
      aria-label="Kelengkapan data lokasi"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div>
          <span className="eyebrow">Kelengkapan Data</span>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 4px', color: 'var(--ink)' }}>
            Kelengkapan Titik di Peta
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
            Perbandingan tempat yang sudah memiliki koordinat peta dengan tempat yang masih butuh penandaan lokasi.
          </p>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            background: percentage >= 80 ? 'var(--notice-success-bg)' : 'var(--notice-warning-bg)',
            color: percentage >= 80 ? 'var(--notice-success-ink)' : 'var(--notice-warning-ink)',
            border: `1px solid ${percentage >= 80 ? 'var(--notice-success-border)' : 'var(--notice-warning-border)'}`,
          }}
        >
          {percentage}% Sudah Ada Titik Peta
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', background: 'var(--surface-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Titik Peta Tersedia</span>
          <strong style={{ fontSize: '18px', color: 'var(--green)' }}>{geocoded}</strong>
          <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>Bisa dilihat langsung di peta</span>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--notice-warning-bg)', borderRadius: '8px', border: '1px solid var(--notice-warning-border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--notice-warning-ink)', display: 'block' }}>Belum Ada Titik Peta</span>
          <strong style={{ fontSize: '18px', color: 'var(--orange)' }}>{needsGeocoding}</strong>
          <span style={{ fontSize: '10px', color: 'var(--notice-warning-ink)', display: 'block' }}>Masih butuh bantuan penandaan lokasi</span>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--surface-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Total Tempat Terdata</span>
          <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{total}</strong>
          <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>Fasilitas publik yang tercatat</span>
        </div>
      </div>

      <div
        role="note"
        style={{
          background: 'var(--surface-secondary)',
          borderLeft: '4px solid var(--purple)',
          padding: '10px 14px',
          borderRadius: '0 8px 8px 0',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--ink)' }}>Mengapa semua tempat tetap dicatat?</strong> Tempat yang belum memiliki titik peta tetap kami tampilkan agar tidak terlewatkan. Relawan dapat membantu menambahkan lokasi saat survei ke lapangan.
      </div>
    </div>
  );
}
