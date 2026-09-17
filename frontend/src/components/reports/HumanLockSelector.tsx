import React from 'react';
import { AccessibilityStatus, STATUS_META } from '@/types';

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
  return (
    <div className="manual-lock">
      <span className="eyebrow">3. Kunci manusia (Wajib)</span>
      <p>Pilih status akhir berdasarkan bukti foto dan pengalaman penggunaan nyata di lapangan.</p>

      <div className="status-choice" role="radiogroup" aria-label="Pilih status aksesibilitas">
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const isSelected = currentStatus === s;

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
              <span>{meta.symbol}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
