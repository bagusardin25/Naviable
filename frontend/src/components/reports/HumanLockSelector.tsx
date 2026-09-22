import React from 'react';
import { AccessibilityStatus, STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

type HumanLockSelectorProps = {
  currentStatus: AccessibilityStatus;
  onSelectStatus: (status: AccessibilityStatus) => void;
};

const STATUSES: AccessibilityStatus[] = [
  'UTUH',
  'TERHALANG',
  'TIDAK_STANDAR',
  'TIDAK_ADA',
  'BELUM_DIKETAHUI',
];

export function HumanLockSelector({
  currentStatus,
  onSelectStatus,
}: HumanLockSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="manual-lock">
      <p>{t('reports.humanLockPrompt')}</p>

      <div className="status-choice" role="radiogroup" aria-label={t('reports.humanLockAria')}>
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const isSelected = currentStatus === s;
          const localizedLabel = t(`status.${s}.label`) || meta.label;

          return (
            <button
              key={s}
              id={`btn-status-${s.toLowerCase()}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={isSelected ? `selected choice-${s.toLowerCase()}` : ''}
              onClick={() => onSelectStatus(s)}
            >
              <Icon name={meta.icon} size={14} />
              <span>{localizedLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
