'use client';

import React from 'react';
import Image from 'next/image';
import { ApiReport, mediaUrl } from '@/lib/api';
import {
  CHAIN_ELEMENT_MAP,
  ChainElementCode,
} from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTranslation } from '@/hooks/useTranslation';

const CODE_BY_NAME = Object.fromEntries(
  (Object.entries(CHAIN_ELEMENT_MAP) as [ChainElementCode, (typeof CHAIN_ELEMENT_MAP)[ChainElementCode]][]).map(
    ([code, meta]) => [meta.codeName, code]
  )
) as Record<string, ChainElementCode>;

type CorrectionHistoryProps = {
  reports: ApiReport[];
  total: number;
  state: 'idle' | 'loading' | 'error';
  onRetry: () => void;
};

/**
 * Report trail for one location. Renders who locked which element and when, so a
 * superseded report stays visible instead of being silently replaced (konsep §11,
 * "crowdsource + sanggahan foto"). Status is always spelled out in text — colour and
 * symbol are decoration, never the only carrier of meaning.
 */
export function CorrectionHistory({ reports, total, state, onRetry }: CorrectionHistoryProps) {
  const { t, formatDate } = useTranslation();

  function elementLabel(name: string): string {
    const code = CODE_BY_NAME[name];
    if (code) {
      const localizedName = t(`elements.${code}.name`) || CHAIN_ELEMENT_MAP[code].label;
      return `${code} · ${localizedName}`;
    }
    return name;
  }

  function formatReportDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return formatDate(date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (state === 'loading') {
    return <p role="status" style={{ fontSize: '13px', color: '#576479' }}>{t('places.historyLoading')}</p>;
  }

  if (state === 'error') {
    return (
      <p role="alert" style={{ fontSize: '13px', color: '#b91c1c' }}>
        {t('places.historyError')}{' '}
        <button type="button" onClick={onRetry} style={{ textDecoration: 'underline', fontWeight: 600 }}>
          {t('places.retryBtn')}
        </button>
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#576479', lineHeight: 1.5 }}>
        {t('places.noCitizenReportsForPlace')}
      </p>
    );
  }

  const shown = reports.length;

  return (
    <section aria-label={t('places.historySectionAria', { total })}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '16px 0 8px', color: 'var(--ink)' }}>
        {t('places.citizenCorrectionHistory', { total })}
      </h3>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
        {reports.map((report) => {
          const labels = report.elements.map((e) => elementLabel(e.element));
          const formattedDate = formatReportDate(report.createdAt);
          return (
            <li
              key={report.id}
              style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface-secondary)' }}
            >
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{report.reporterName}</strong> · {formattedDate}
              </div>

              <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'grid', gap: '4px' }}>
                {report.elements.map((evidence) => (
                  <li key={evidence.element} style={{ fontSize: '13px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong>{elementLabel(evidence.element)}</strong>:
                    <StatusBadge status={evidence.status} size="sm" />
                    {evidence.note ? <span style={{ color: 'var(--muted)' }}> — {evidence.note}</span> : null}
                  </li>
                ))}
              </ul>

              <a
                href={mediaUrl(report.photoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('places.viewEvidencePhoto')}
                data-icon-only-link
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--purple)' }}
              >
                <Image
                  src={mediaUrl(report.photoUrl)}
                  alt={t('places.evidencePhotoAlt', {
                    name: report.reporterName,
                    date: formattedDate,
                    elements: labels.join(', '),
                  })}
                  width={72}
                  height={54}
                  unoptimized
                  style={{ objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
                {t('places.viewEvidencePhoto')}
              </a>
            </li>
          );
        })}
      </ol>
      {total > shown && (
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
          {t('places.showingRecentReports', { shown, total })}
        </p>
      )}
    </section>
  );
}
