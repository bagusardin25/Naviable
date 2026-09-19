'use client';

import React, { useId, useState } from 'react';
import Image from 'next/image';
import { ElementItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';

type AccessibilityChainProps = {
  elements: ElementItem[];
};

export function AccessibilityChain({ elements }: AccessibilityChainProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const id = useId();

  return (
    <>
      <p className="chain-help">Pilih fasilitas untuk melihat catatan dan bukti.</p>
      <div className="access-chain" aria-label="Kondisi 8 titik akses">
        {elements.map((e) => {
          const expanded = expandedCode === e.code;
          return (
            <article key={e.code} className="access-chain-item">
              <button
                type="button"
                className="access-chain-row"
                aria-expanded={expanded}
                aria-controls={`${id}-${e.code}`}
                onClick={() => setExpandedCode(expanded ? null : e.code)}
              >
                <span className="element-code">{e.code}</span>
                <span className="access-chain-name">{e.label}</span>
                <StatusBadge status={e.status} variant="compact" />
                <Icon name="chevron" size={14} className="access-chain-chevron" />
              </button>
              <div id={`${id}-${e.code}`} hidden={!expanded}>
                {expanded && (
                  <div className="access-chain-evidence">
                    {e.isPreSurveyEvidence ? (
                      <span className="badge-presurvey">Informasi awal · belum diverifikasi</span>
                    ) : e.lockedBy === 'kontributor' ? (
                      <span className="access-chain-source"><Icon name="check" size={12} />Diverifikasi warga</span>
                    ) : e.lockedBy === 'ai_draf' ? (
                      <span className="badge-presurvey">Draf AI · belum dikonfirmasi</span>
                    ) : null}
                    <p className="element-note">{e.note || 'Belum ada catatan untuk fasilitas ini.'}</p>
                    {e.photoUrl && (
                      <a href={e.photoUrl} target="_blank" rel="noopener noreferrer">
                        <Image src={e.photoUrl} alt={`Bukti foto ${e.label}`} width={240} height={135} unoptimized className="access-chain-photo" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
