import React from 'react';

export function MapLegend() {
  return (
    <div className="map-legend-inline" aria-label="Keterangan kondisi di peta">
      <span title="Akses dilaporkan bisa digunakan">
        <i className="dot utuh" aria-hidden="true" />
        Bisa Diakses
      </span>
      <span title="Akses dilaporkan memiliki keterbatasan">
        <i className="dot warning" aria-hidden="true" />
        Akses Terbatas
      </span>
      <span title="Akses dilaporkan belum memadai">
        <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#df3a43', display: 'inline-block' }} aria-hidden="true" />
        Belum Aksesibel
      </span>
      <span title="Informasi akses belum dilaporkan">
        <i className="dot unknown" aria-hidden="true" />
        Belum Diketahui
      </span>
    </div>
  );
}
