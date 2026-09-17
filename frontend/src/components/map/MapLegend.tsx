import React from 'react';

export function MapLegend() {
  return (
    <div className="map-legend-inline" aria-label="Keterangan status pre-survey peta">
      <span title="Pre-survey: akses kursi roda dilaporkan tersedia">
        <i className="dot utuh" aria-hidden="true" />
        Akses Dilaporkan
      </span>
      <span title="Pre-survey: akses kursi roda terbatas dilaporkan">
        <i className="dot warning" aria-hidden="true" />
        Akses Terbatas
      </span>
      <span title="Pre-survey: akses kursi roda dilaporkan tidak tersedia">
        <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#df3a43', display: 'inline-block' }} aria-hidden="true" />
        Tidak Aksesibel
      </span>
      <span title="Pre-survey: data aksesibilitas belum diketahui">
        <i className="dot unknown" aria-hidden="true" />
        Belum Diketahui
      </span>
    </div>
  );
}
