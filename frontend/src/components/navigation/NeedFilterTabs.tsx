'use client';

import React from 'react';
import { AccessibilityNeed } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

type NeedFilterTabsProps = {
  currentNeed: AccessibilityNeed;
  onSelectNeed: (need: AccessibilityNeed) => void;
};

const NEEDS: AccessibilityNeed[] = ['Mobilitas', 'Visual', 'Auditori', 'Sensorik'];

export function NeedFilterTabs({ currentNeed, onSelectNeed }: NeedFilterTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="need-filter-wrapper">
      <span className="eyebrow">{t('needs.label')}</span>
      <div className="need-tabs" role="tablist" aria-label={t('needs.label')}>
        {NEEDS.map((n) => (
          <button
            key={n}
            id={`tab-need-${n.toLowerCase()}`}
            type="button"
            role="tab"
            aria-selected={currentNeed === n}
            className={currentNeed === n ? 'active' : ''}
            onClick={() => onSelectNeed(n)}
          >
            {t(`needs.${n}`, n)}
          </button>
        ))}
      </div>
    </div>
  );
}
