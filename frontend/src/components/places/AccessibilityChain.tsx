'use client';

import React, { useId, useState } from 'react';
import Image from 'next/image';
import { ElementItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

type AccessibilityChainProps = {
  elements: ElementItem[];
};

export function AccessibilityChain({ elements }: AccessibilityChainProps) {
  const { t } = useTranslation();
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const id = useId();

  return (
    <>
      <p className="chain-help">{t('places.chainHelp')}</p>
      <div className="access-chain" aria-label={t('places.chainAria')}>
        {elements.map((e) => {
          const expanded = expandedCode === e.code;
          const localizedName = t(`elements.${e.code}.name`, e.label);
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
                <span className="access-chain-name">{localizedName}</span>
                <StatusBadge status={e.status} variant="compact" />
                <Icon name="chevron" size={14} className="access-chain-chevron" />
              </button>
              <div id={`${id}-${e.code}`} hidden={!expanded}>
                {expanded && (
                  <div className="access-chain-evidence">
                    {e.isPreSurveyEvidence ? (
                      <span className="badge-presurvey">{t('places.initialDataUnverified')}</span>
                    ) : e.lockedBy === 'kontributor' ? (
                      <span className="access-chain-source">
                        <Icon name="check" size={12} />
                        {t('places.verifiedByCitizens')}
                      </span>
                    ) : e.lockedBy === 'ai_draf' ? (
                      <span className="badge-presurvey">{t('places.aiDraftUnconfirmed')}</span>
                    ) : null}
                    <p className="element-note">{e.note || t('places.noNotesForFacility')}</p>
                    {e.photoUrl && (
                      <a
                        href={e.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('places.photoEvidenceOf', { label: localizedName })}
                        data-icon-only-link
                      >
                        <Image
                          src={e.photoUrl}
                          alt={t('places.photoEvidenceOf', { label: localizedName })}
                          width={240}
                          height={135}
                          unoptimized
                          className="access-chain-photo"
                        />
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
