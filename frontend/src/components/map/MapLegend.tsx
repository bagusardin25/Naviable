import React from 'react';
import { ACCESSIBILITY_STATUS_CONFIG, AccessibilityStatus } from '@/types';
import { Icon } from '@/components/ui/Icon';

const LEGEND_STATUSES: AccessibilityStatus[] = [
  'UTUH',
  'TERHALANG',
  'TIDAK_STANDAR',
  'TIDAK_ADA',
  'BELUM_DIKETAHUI',
];

export function MapLegend() {
  return (
    <div className="map-legend-inline" aria-label="Keterangan kondisi di peta">
      {LEGEND_STATUSES.map((statusKey) => {
        const item = ACCESSIBILITY_STATUS_CONFIG[statusKey];
        return (
          <span
            key={statusKey}
            className={`legend-item legend-${statusKey.toLowerCase()}`}
            title={`${item.label}: ${item.short}`}
          >
            <Icon name={item.icon} size={13} aria-hidden="true" />
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}
