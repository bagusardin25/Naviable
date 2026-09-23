'use client';

import React from 'react';
import { Place } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

type DataQualityCardProps = {
  places: Place[];
};

export function DataQualityCard({ places }: DataQualityCardProps) {
  const { t } = useTranslation();
  const total = places.length;
  const geocoded = places.filter((p) => !p.needsGeocoding && p.lat !== null && p.lng !== null).length;
  const needsGeocoding = places.filter((p) => p.needsGeocoding || p.lat === null || p.lng === null).length;
  const percentage = total > 0 ? Math.round((geocoded / total) * 100) : 0;

  return (
    <div
      className="card"
      style={{ padding: '16px 20px', minWidth: 0 }}
      aria-label={t('observatory.qualityCardAria')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <span className="eyebrow">{t('observatory.qualityEyebrow')}</span>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '2px 0 4px', color: 'var(--ink)', overflowWrap: 'break-word' }}>
            {t('observatory.qualityTitle')}
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', margin: 0, overflowWrap: 'break-word' }}>
            {t('observatory.qualityDesc')}
          </p>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            background: percentage >= 80 ? 'var(--notice-success-bg)' : 'var(--notice-warning-bg)',
            color: percentage >= 80 ? 'var(--notice-success-ink)' : 'var(--notice-warning-ink)',
            border: `1px solid ${percentage >= 80 ? 'var(--notice-success-border)' : 'var(--notice-warning-border)'}`,
            whiteSpace: 'normal',
            textAlign: 'center',
          }}
        >
          {t('observatory.alreadyMappedPill', { percentage })}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', background: 'var(--surface-secondary)', borderRadius: '8px', border: '1px solid var(--border)', minWidth: 0 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', display: 'block', overflowWrap: 'break-word' }}>{t('observatory.mappedAvailable')}</span>
          <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--green)', display: 'block', margin: '2px 0' }}>{geocoded}</strong>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', display: 'block', overflowWrap: 'break-word' }}>{t('observatory.mappedAvailableSub')}</span>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--notice-warning-bg)', borderRadius: '8px', border: '1px solid var(--notice-warning-border)', minWidth: 0 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--notice-warning-ink)', display: 'block', overflowWrap: 'break-word' }}>{t('observatory.unmappedCount')}</span>
          <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--orange)', display: 'block', margin: '2px 0' }}>{needsGeocoding}</strong>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--notice-warning-ink)', display: 'block', overflowWrap: 'break-word' }}>{t('observatory.unmappedSub')}</span>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--surface-secondary)', borderRadius: '8px', border: '1px solid var(--border)', minWidth: 0 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', display: 'block', overflowWrap: 'break-word' }}>{t('observatory.totalRecorded')}</span>
          <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--ink)', display: 'block', margin: '2px 0' }}>{total}</strong>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', display: 'block', overflowWrap: 'break-word' }}>{t('observatory.totalRecordedSub')}</span>
        </div>
      </div>

      <div
        role="note"
        style={{
          background: 'var(--surface-secondary)',
          borderLeft: '4px solid var(--purple)',
          padding: '10px 14px',
          borderRadius: '0 8px 8px 0',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          overflowWrap: 'break-word',
        }}
      >
        <strong style={{ color: 'var(--ink)' }}>{t('observatory.whyRecordAllTitle')}</strong> {t('observatory.whyRecordAllBody')}
      </div>
    </div>
  );
}
