'use client';

import React from 'react';
import { AccessibilityNeed } from '@/types';

type NeedFilterTabsProps = {
  currentNeed: AccessibilityNeed;
  onSelectNeed: (need: AccessibilityNeed) => void;
};

const NEEDS: AccessibilityNeed[] = ['Mobilitas', 'Visual', 'Auditori', 'Sensorik'];

export function NeedFilterTabs({ currentNeed, onSelectNeed }: NeedFilterTabsProps) {
  return (
    <div className="need-filter-wrapper">
      <span className="eyebrow">Kebutuhan akses</span>
      <div className="need-tabs" role="tablist" aria-label="Pilih jenis kebutuhan akses">
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
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
