import React from 'react';
import { ElementItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

type AccessibilityChainProps = {
  elements: ElementItem[];
};

export function AccessibilityChain({ elements }: AccessibilityChainProps) {
  return (
    <div className="element-grid" aria-label="Rantai 8 elemen aksesibilitas">
      {elements.map((e) => (
        <article key={e.code} className="element-card">
          <div className="element-header">
            <span className="element-code">{e.code}</span>
            <strong>{e.label}</strong>
          </div>
          <div className="element-badge-wrapper">
            <StatusBadge status={e.status} />
          </div>
          <p className="element-note">{e.note}</p>
        </article>
      ))}
    </div>
  );
}
