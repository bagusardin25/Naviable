'use client';

import React from 'react';
import { ACCESSIBILITY_STATUS_CONFIG, AccessibilityStatus } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

const LEGEND_STATUSES: AccessibilityStatus[] = [
  'UTUH',
  'TERHALANG',
  'TIDAK_STANDAR',
  'TIDAK_ADA',
  'BELUM_DIKETAHUI',
];

export function MapLegend() {
  const { t } = useTranslation();

  return (
    <div className="map-legend-inline" aria-label={t('map.legendAria')}>
      {LEGEND_STATUSES.map((statusKey) => {
        const item = ACCESSIBILITY_STATUS_CONFIG[statusKey];
        const label = t(`status.${statusKey}.label`, item.label);
        const short = t(`status.${statusKey}.short`, item.short);
        return (
          <span
            key={statusKey}
            className={`legend-item legend-${statusKey.toLowerCase()}`}
            title={`${label}: ${short}`}
          >
            <Icon name={item.icon} size={13} aria-hidden="true" />
            <span>{label}</span>
          </span>
        );
      })}
    </div>
  );
}
