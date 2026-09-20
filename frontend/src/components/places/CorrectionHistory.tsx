'use client';

import React from 'react';
import Image from 'next/image';
import { ApiReport, mediaUrl } from '@/lib/api';
import {
  CHAIN_ELEMENT_MAP,
  ChainElementCode,
} from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

const CODE_BY_NAME = Object.fromEntries(
  (Object.entries(CHAIN_ELEMENT_MAP) as [ChainElementCode, (typeof CHAIN_ELEMENT_MAP)[ChainElementCode]][]).map(
    ([code, meta]) => [meta.codeName, code]
  )
) as Record<string, ChainElementCode>;

function elementLabel(name: string): string {
  const code = CODE_BY_NAME[name];
  return code ? `${code} · ${CHAIN_ELEMENT_MAP[code].label}` : name;
}


function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  if (state === 'loading') {
    return <p role="status" style={{ fontSize: '13px', color: '#576479' }}>Memuat riwayat pembaruan…</p>;
  }

  if (state === 'error') {
    return (
      <p role="alert" style={{ fontSize: '13px', color: '#b91c1c' }}>
        Riwayat pembaruan belum dapat dimuat.{' '}
        <button type="button" onClick={onRetry} style={{ textDecoration: 'underline', fontWeight: 600 }}>
          Coba lagi
        </button>
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: '#576479', lineHeight: 1.5 }}>
        Belum ada laporan dari warga untuk tempat ini. Informasi di atas masih bersumber dari data awal publik.
      </p>
    );
  }

  const shown = reports.length;

  return (
    <section aria-label={`Riwayat pembaruan, ${total} laporan`}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '16px 0 8px', color: 'var(--ink)' }}>
        Riwayat pembaruan warga ({total})
      </h3>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
        {reports.map((report) => {
          const labels = report.elements.map((e) => elementLabel(e.element));
          return (
            <li
              key={report.id}
              style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface-secondary)' }}
            >
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{report.reporterName}</strong> · {formatDate(report.createdAt)}
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--purple)' }}
              >
                <Image
                  src={mediaUrl(report.photoUrl)}
                  alt={`Foto bukti dari ${report.reporterName} pada ${formatDate(report.createdAt)} untuk ${labels.join(', ')}`}
                  width={72}
                  height={54}
                  unoptimized
                  style={{ objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
                Buka foto bukti
              </a>
            </li>
          );
        })}
      </ol>
      {total > shown && (
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
          Menampilkan {shown} laporan terbaru dari total {total}.
        </p>
      )}
    </section>
  );
}
