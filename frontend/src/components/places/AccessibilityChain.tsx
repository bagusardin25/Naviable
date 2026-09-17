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
          <div className="element-badge-wrapper" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', margin: '4px 0' }}>
            <StatusBadge status={e.status} />
            {e.isPreSurveyEvidence && (
              <span className="badge-presurvey" style={{ fontSize: '9px', padding: '2px 6px' }}>
                Pre-survey evidence
              </span>
            )}
          </div>
          <p className="element-note">{e.note}</p>
        </article>
      ))}
    </div>
  );
}
