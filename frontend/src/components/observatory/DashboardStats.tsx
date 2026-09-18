import React from 'react';
import { Place } from '@/types';

type DashboardStatsProps = {
  places: Place[];
};

export function DashboardStats({ places }: DashboardStatsProps) {
  const brokenCount = places.filter((p) => ['TERHALANG', 'TIDAK_STANDAR', 'TIDAK_ADA'].includes(p.overall)).length;
  const unknownCount = places
    .flatMap((p) => p.elements)
    .filter((e) => e.status === 'BELUM_DIKETAHUI').length;
  const totalPhotos = places.reduce((sum, p) => sum + p.photos, 0);

  return (
    <div className="metric-grid" aria-label="Statistik keterbukaan akses">
      <article>
        <span>Tempat Terdata</span>
        <strong>{places.length}</strong>
        <small>Fasilitas publik di Surabaya</small>
      </article>

      <article>
        <span>Akses Masih Terputus</span>
        <strong style={{ color: '#e78a16' }}>{brokenCount}</strong>
        <small>Perlu perbaikan segera</small>
      </article>

      <article>
        <span>Data Belum Lengkap</span>
        <strong style={{ color: '#7d8798' }}>{unknownCount}</strong>
        <small>Butuh pengecekan warga</small>
      </article>

      <article>
        <span>Foto Kondisi Warga</span>
        <strong style={{ color: '#6d45cc' }}>{totalPhotos}</strong>
        <small>Kontribusi dari lapangan</small>
      </article>
    </div>
  );
}
