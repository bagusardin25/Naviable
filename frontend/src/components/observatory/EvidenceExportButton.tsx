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
      'Alamat',
      'Latitude',
      'Longitude',
      'Perlu_Geocoding',
      'Status_PreSurvey_Kursi_Roda',
      'Status_Verifikasi_Tim',
      'Tingkat_Bukti',
      'Sumber_Data',
      'Lisensi_Sumber',
      'Kode_Elemen',
      'Nama_Elemen',
      'Status_Aksesibilitas',
      'Catatan_PreSurvey_Atau_Lapangan',
      'Status_Lokasi_Secara_Umum',
    ];

    const rows = places.flatMap((p) =>
      p.elements.map((e) => [
        p.id,
        p.name,
        p.category,
        p.district,
        p.address || '',
        p.lat !== null ? p.lat : 'NULL',
        p.lng !== null ? p.lng : 'NULL',
        p.needsGeocoding ? 'YA' : 'TIDAK',
        p.wheelchairStatus,
        p.verifiedByTeam ? 'TERVERIFIKASI' : 'PRE-SURVEY',
        p.evidenceLevelLabel,
        p.sourceName || 'OpenStreetMap',
        p.sourceLicense || 'ODbL 1.0',
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
    link.download = `naviable-evidence-pack-surabaya-seed-${new Date().toISOString().slice(0, 10)}.csv`;
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
