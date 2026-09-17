'use client';
import { useState } from 'react';
import { API_URL } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import type { Place } from '@/types';

export function EvidenceExportButton({ places }: { places: Place[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setPending(true); setError('');
    try {
      const response = await fetch(`${API_URL}/api/evidence.csv`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error('Ekspor belum tersedia. Coba lagi.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = `naviable-evidence-${new Date().toISOString().slice(0,10)}.csv`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ekspor gagal'); }
    finally { setPending(false); }
  }
  return <div><button id="btn-export-csv" type="button" className="primary-action export" disabled={pending || !places.length} onClick={download}><Icon name="download" /><span>{pending ? 'Menyiapkan…' : 'Export Evidence Pack (CSV)'}</span></button>{error && <p role="alert">{error}</p>}</div>;
}
