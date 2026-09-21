import React from 'react';
import { Place } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

type DistrictSnapshotProps = {
  places: Place[];
};

export function DistrictSnapshot({ places }: DistrictSnapshotProps) {
  const { t } = useTranslation();
  const districts = Array.from(new Set(places.map((p) => p.district)));

  return (
    <section className="card" aria-label={t('observatory.districtAria')}>
      <div className="card-title-row">
        <div>
          <span className="eyebrow">{t('observatory.districtEyebrow')}</span>
          <h2>{t('observatory.districtTitle')}</h2>
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
                <span>{districtPlaces.length} {t('observatory.districtPlacesCount')}</span>
              </div>
              <span className="district-badge">
                {t('observatory.districtIntactRatio', { intact: intactCount, total: districtPlaces.length })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
