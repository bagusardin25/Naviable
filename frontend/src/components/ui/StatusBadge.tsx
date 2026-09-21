'use client';

import React from 'react';
import { AccessibilityStatus, ACCESSIBILITY_STATUS_CONFIG } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

export type StatusBadgeProps = {
  status: AccessibilityStatus;
  size?: 'sm' | 'md';
  className?: string;
  variant?: 'pill' | 'compact';
  label?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  style?: React.CSSProperties;
};

export function StatusBadge({
  status,
  size = 'sm',
  className = '',
  variant = 'pill',
  label,
  showIcon = true,
  showLabel = true,
  style,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = ACCESSIBILITY_STATUS_CONFIG[status] ?? ACCESSIBILITY_STATUS_CONFIG.BELUM_DIKETAHUI;
  const iconSize = size === 'md' ? 14 : 12;
  const statusKey = (status as keyof typeof ACCESSIBILITY_STATUS_CONFIG) || 'BELUM_DIKETAHUI';
  const localizedLabel = t(`status.${statusKey}.label`, config.label);
  const localizedShort = t(`status.${statusKey}.short`, config.short);
  const displayLabel = label ?? localizedLabel;

  return (
    <span
      data-status={status}
      className={`status-badge ${config.badgeClass} ${size === 'md' ? 'status-badge-md' : ''} ${variant === 'compact' ? 'status-badge-compact' : ''} ${className}`}
      title={`${displayLabel}: ${localizedShort}`}
      aria-label={`${displayLabel}: ${localizedShort}`}
      style={style}
    >
      {showIcon && <Icon name={config.icon} size={iconSize} aria-hidden="true" />}
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
}
