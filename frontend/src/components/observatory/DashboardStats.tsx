import React from 'react';
import { Place } from '@/types';

type DashboardStatsProps = {
  places: Place[];
};

export function DashboardStats({ places }: DashboardStatsProps) {
  const brokenCount = places.filter((p) => p.overall !== 'UTUH').length;
  const unknownCount = places
    .flatMap((p) => p.elements)
    .filter((e) => e.status === 'BELUM_DIKETAHUI').length;
  const totalPhotos = places.reduce((sum, p) => sum + p.photos, 0);

  return (
    <div className="metric-grid" aria-label="Metrik observatorium aksesibilitas">
      <article>
        <span>Lokasi Terpetakan</span>
        <strong>{places.length}</strong>
        <small>Dataset publik Surabaya</small>
      </article>

      <article>
        <span>Rantai Perlu Perhatian</span>
        <strong style={{ color: '#e78a16' }}>{brokenCount}</strong>
        <small>Titik putus terkonfirmasi</small>
      </article>

      <article>
        <span>Elemen Belum Diketahui</span>
        <strong style={{ color: '#7d8798' }}>{unknownCount}</strong>
        <small>Prioritas bukti berikutnya</small>
      </article>

      <article>
        <span>Foto Bukti Lapangan</span>
        <strong style={{ color: '#6d45cc' }}>{totalPhotos}</strong>
        <small>Verifikasi komunitas</small>
      </article>
    </div>
  );
}
