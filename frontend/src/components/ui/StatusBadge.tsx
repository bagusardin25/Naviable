import React from 'react';
import { AccessibilityStatus, ACCESSIBILITY_STATUS_CONFIG } from '@/types';
import { Icon } from '@/components/ui/Icon';

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
  const config = ACCESSIBILITY_STATUS_CONFIG[status] ?? ACCESSIBILITY_STATUS_CONFIG.BELUM_DIKETAHUI;
  const iconSize = size === 'md' ? 14 : 12;
  const displayLabel = label ?? config.label;

  return (
    <span
      data-status={status}
      className={`status-badge ${config.badgeClass} ${size === 'md' ? 'status-badge-md' : ''} ${variant === 'compact' ? 'status-badge-compact' : ''} ${className}`}
      title={`${config.label}: ${config.short}`}
      aria-label={`${displayLabel}: ${config.short}`}
      style={style}
    >
      {showIcon && <Icon name={config.icon} size={iconSize} aria-hidden="true" />}
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
}
