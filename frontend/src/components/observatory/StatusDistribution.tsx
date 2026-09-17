import React from 'react';
import { Place, ChainElementCode, CHAIN_ELEMENT_MAP } from '@/types';

type StatusDistributionProps = {
  places: Place[];
};

const OBSERVED_CODES: ChainElementCode[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'];

export function StatusDistribution({ places }: StatusDistributionProps) {
  return (
    <section className="card" aria-label="Distribusi status hambatan elemen aksesibilitas">
      <div className="card-title-row">
        <div>
          <span className="eyebrow">Analisis Rantai Akses</span>
          <h2>Elemen Paling Sering Putus</h2>
        </div>
      </div>

      <div className="bar-list">
        {OBSERVED_CODES.map((code) => {
          const brokenOccurrences = places
            .flatMap((p) => p.elements)
            .filter(
              (e) =>
                e.code === code &&
                (e.status === 'TERHALANG' ||
                  e.status === 'TIDAK_STANDAR' ||
                  e.status === 'TIDAK_ADA')
            ).length;

          const label = CHAIN_ELEMENT_MAP[code]?.label ?? code;
          const percentage = places.length ? Math.round((brokenOccurrences / places.length) * 100) : 0;

          return (
            <div className="bar-row" key={code}>
              <div>
                <strong>{code}</strong>
                <span>{label}</span>
              </div>
              <div
                className="bar-track"
                role="progressbar"
                aria-valuenow={brokenOccurrences}
                aria-valuemin={0}
                aria-valuemax={places.length}
                aria-label={`${code} ${label}: ${brokenOccurrences} lokasi`}
              >
                <i style={{ width: `${percentage}%` }} />
              </div>
              <b>{brokenOccurrences}</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}
