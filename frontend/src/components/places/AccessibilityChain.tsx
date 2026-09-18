import React from 'react';
import Image from 'next/image';
import { ElementItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

type AccessibilityChainProps = {
  elements: ElementItem[];
};

export function AccessibilityChain({ elements }: AccessibilityChainProps) {
  return (
    <div className="element-grid" aria-label="Kondisi 8 titik akses">
      {elements.map((e) => (
        <article key={e.code} className="element-card">
          <div className="element-header">
            <span className="element-code">{e.code}</span>
            <strong>{e.label}</strong>
          </div>
          <div className="element-badge-wrapper" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', margin: '4px 0' }}>
            <StatusBadge status={e.status} />
            {e.isPreSurveyEvidence && (
              <span className="badge-presurvey" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                Informasi awal
              </span>
            )}
          </div>
          <p className="element-note">{e.note}</p>
          {e.photoUrl && <a href={e.photoUrl} target="_blank" rel="noopener noreferrer"><Image src={e.photoUrl} alt={`Bukti foto ${e.label}`} width={240} height={135} unoptimized style={{ width: '100%', objectFit: 'contain' }} /></a>}
          {e.lockedBy === 'kontributor' && <small style={{ color: '#166534', fontSize: '11px', marginTop: '4px' }}>✓ Diverifikasi warga</small>}
        </article>
      ))}
    </div>
  );
}
