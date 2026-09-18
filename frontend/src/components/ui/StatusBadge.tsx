import React from 'react';
import { AccessibilityStatus, STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';

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

  const statusIcon =
    status === 'UTUH'
      ? 'check-circle'
      : status === 'TERHALANG'
      ? 'warning'
      : status === 'TIDAK_STANDAR'
      ? 'alert-circle'
      : status === 'TIDAK_ADA'
      ? 'x-circle'
      : 'help-circle';

  return (
    <span
      className={`status-badge ${statusClassMap[status]} ${size === 'md' ? 'status-badge-md' : ''} ${className}`}
      title={`${meta.label}: ${meta.short}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <Icon name={statusIcon} size={size === 'md' ? 13 : 11} />
      <span>{meta.label}</span>
    </span>
  );
}
