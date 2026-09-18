import React from 'react';
import { AccessibilityStatus, STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';

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

const STATUS_ICONS: Record<AccessibilityStatus, string> = {
  UTUH: 'check-circle',
  TERHALANG: 'warning',
  TIDAK_STANDAR: 'alert-circle',
  TIDAK_ADA: 'x-circle',
  BELUM_DIKETAHUI: 'help-circle',
};

export function HumanLockSelector({
  currentStatus,
  onSelectStatus,
}: HumanLockSelectorProps) {
  return (
    <div className="manual-lock">
      <span className="eyebrow">3. Tentukan kondisi akhir (Wajib)</span>
      <p>Pilih kondisi yang paling sesuai dengan apa yang Anda lihat langsung di lokasi.</p>

      <div className="status-choice" role="radiogroup" aria-label="Pilih kondisi akses">
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const isSelected = currentStatus === s;
          const icon = STATUS_ICONS[s];

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
              <Icon name={icon} size={14} />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
