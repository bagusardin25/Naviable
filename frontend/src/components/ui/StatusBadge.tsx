import React from 'react';
import { AccessibilityStatus, STATUS_META } from '@/types';

type StatusBadgeProps = {
  status: AccessibilityStatus;
  size?: 'sm' | 'md';
  className?: string;
};

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const meta = STATUS_META[status];

  const statusClassMap: Record<AccessibilityStatus, string> = {
    UTUH: 'status-utuh',
    TERHALANG: 'status-terhalang',
    TIDAK_STANDAR: 'status-tidak_standar',
    TIDAK_ADA: 'status-tidak_ada',
    BELUM_DIKETAHUI: 'status-belum_diketahui',
  };

  return (
    <span
      className={`status-badge ${statusClassMap[status]} ${size === 'md' ? 'status-badge-md' : ''} ${className}`}
      title={`${meta.label}: ${meta.short}`}
    >
      <strong aria-hidden="true">{meta.symbol}</strong>
      <span>{meta.label}</span>
    </span>
  );
}
