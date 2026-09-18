import React from 'react';
import { Place } from '@/types';

type DistrictSnapshotProps = {
  places: Place[];
};

export function DistrictSnapshot({ places }: DistrictSnapshotProps) {
  const districts = Array.from(new Set(places.map((p) => p.district)));

  return (
    <section className="card" aria-label="Ringkasan kondisi per kecamatan Surabaya">
      <div className="card-title-row">
        <div>
          <span className="eyebrow">Wilayah Surabaya</span>
          <h2>Kondisi per Kecamatan</h2>
        </div>
      </div>

      <div className="district-list" role="list">
        {districts.map((district) => {
          const districtPlaces = places.filter((p) => p.district === district);
          const intactCount = districtPlaces.filter((p) => p.overall === 'UTUH').length;

          return (
            <div key={district} className="district-row" role="listitem">
              <div>
                <strong>Kec. {district}</strong>
                <span>{districtPlaces.length} tempat terdata</span>
              </div>
              <span className="district-badge">
                {intactCount} / {districtPlaces.length} bisa digunakan
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
