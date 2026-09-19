import React from 'react';
import { AccessibilityStatus, STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';

type StatusBadgeProps = {
  status: AccessibilityStatus;
  size?: 'sm' | 'md';
  className?: string;
  variant?: 'pill' | 'compact';
};

export function StatusBadge({ status, size = 'sm', className = '', variant = 'pill' }: StatusBadgeProps) {
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
      ? variant === 'compact' ? 'check' : 'check-circle'
      : status === 'TERHALANG'
      ? 'warning'
      : status === 'TIDAK_STANDAR'
      ? 'alert-circle'
      : status === 'TIDAK_ADA'
      ? 'x-circle'
      : 'help-circle';

  return (
    <span
      data-status={status}
      className={`status-badge ${statusClassMap[status]} ${size === 'md' ? 'status-badge-md' : ''} ${variant === 'compact' ? 'status-badge-compact' : ''} ${className}`}
      title={`${meta.label}: ${meta.short}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      <Icon name={statusIcon} size={size === 'md' ? 13 : 11} />
      <span>{variant === 'compact' && status === 'TIDAK_ADA' ? 'Tidak ada' : meta.label}</span>
    </span>
  );
}
