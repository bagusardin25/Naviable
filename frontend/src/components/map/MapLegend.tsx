import React from 'react';

export function MapLegend() {
  return (
    <div className="map-legend-inline" aria-label="Keterangan status peta">
      <span>
        <i className="dot utuh" aria-hidden="true" />
        Utuh
      </span>
      <span>
        <i className="dot warning" aria-hidden="true" />
        Perlu perhatian
      </span>
      <span>
        <i className="dot unknown" aria-hidden="true" />
        Belum diketahui
      </span>
    </div>
  );
}
