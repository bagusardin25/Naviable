'use client';

import React from 'react';
import { Place } from '@/types';
import { Icon } from '@/components/ui/Icon';

type EvidenceExportButtonProps = {
  places: Place[];
};

export function EvidenceExportButton({ places }: EvidenceExportButtonProps) {
  function exportEvidenceCsv() {
    const headers = [
      'ID',
      'Nama_Lokasi',
      'Kategori',
      'Kecamatan',
      'Latitude',
      'Longitude',
      'Kode_Elemen',
      'Nama_Elemen',
      'Status_Aksesibilitas',
      'Catatan_Lapangan',
      'Status_Lokasi_Secara_Umum',
    ];

    const rows = places.flatMap((p) =>
      p.elements.map((e) => [
        p.id,
        p.name,
        p.category,
        p.district,
        p.lat,
        p.lng,
        e.code,
        e.label,
        e.status,
        e.note,
        p.overall,
      ])
    );

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `naviable-evidence-pack-surabaya-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      id="btn-export-csv"
      type="button"
      className="primary-action export"
      onClick={exportEvidenceCsv}
      title="Unduh seluruh data rantai aksesibilitas dalam format CSV"
    >
      <Icon name="download" />
      <span>Export Evidence Pack (CSV)</span>
    </button>
  );
}
