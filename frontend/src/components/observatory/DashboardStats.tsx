import React from 'react';
import { Place } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

type DashboardStatsProps = {
  places: Place[];
};

export function DashboardStats({ places }: DashboardStatsProps) {
  const { t } = useTranslation();
  const brokenCount = places.filter((p) => ['TERHALANG', 'TIDAK_STANDAR', 'TIDAK_ADA'].includes(p.overall)).length;
  const unknownCount = places
    .flatMap((p) => p.elements)
    .filter((e) => e.status === 'BELUM_DIKETAHUI').length;
  const totalPhotos = places.reduce((sum, p) => sum + p.photos, 0);

  return (
    <div className="metric-grid" aria-label={t('observatory.statsAria')}>
      <article>
        <span>{t('observatory.recordedPlaces')}</span>
        <strong>{places.length}</strong>
        <small>{t('observatory.publicFacilities')}</small>
      </article>

      <article>
        <span>{t('observatory.brokenAccess')}</span>
        <strong style={{ color: 'var(--orange, #e78a16)' }}>{brokenCount}</strong>
        <small>{t('observatory.needsUrgentFix')}</small>
      </article>

      <article>
        <span>{t('observatory.incompleteData')}</span>
        <strong style={{ color: 'var(--muted, #7d8798)' }}>{unknownCount}</strong>
        <small>{t('observatory.needsCitizenCheck')}</small>
      </article>

      <article>
        <span>{t('observatory.citizenPhotos')}</span>
        <strong style={{ color: 'var(--purple, #6d45cc)' }}>{totalPhotos}</strong>
        <small>{t('observatory.fieldContributions')}</small>
      </article>
    </div>
  );
}
