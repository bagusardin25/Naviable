import Image from 'next/image';
import type { ApiAnalysis } from '@/lib/api';
import { STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';

type Props = { analysis: ApiAnalysis | null; analyzing: boolean; error: string; uploadedPhotoUrl: string | null; elementCode: string };
export function AIDraftPanel({ analysis, analyzing, error, uploadedPhotoUrl, elementCode }: Props) {
  const draft = analysis?.drafts.find(d => d.element === elementCode);
  const integrity = analysis?.photoIntegrity;
  const integrityLabel = integrity?.outcome === 'trusted_ai_provenance'
    ? 'Penanda AI terverifikasi'
    : integrity?.outcome === 'suspicious'
      ? 'Perlu foto pembanding'
      : integrity
        ? 'Keaslian tidak dapat dipastikan'
        : 'Belum diperiksa';
  const integrityTone = integrity?.outcome === 'trusted_ai_provenance'
    ? 'blocked'
    : integrity?.outcome === 'suspicious'
      ? 'warning'
      : 'neutral';
  return <div className="ai-draft-section">
    <div className="card-title-row"><div><span className="eyebrow">Bantuan otomatis</span><h2>2. Saran dari Foto</h2></div><span className={`live-pill ${draft ? 'ready' : ''}`}>{analyzing ? 'Memeriksa…' : draft ? 'Saran siap' : 'Belum dicek'}</span></div>
    <div className="vision-stage" aria-label="Pratinjau foto bukti">{uploadedPhotoUrl ? <Image src={uploadedPhotoUrl} alt="Foto kondisi yang diunggah" width={280} height={140} unoptimized className="vision-preview-img" style={{ objectFit: 'contain' }} /> : <Icon name="photo" size={54} />}</div>
    <div className={`integrity-result ${integrityTone}`} role={integrity?.outcome === 'trusted_ai_provenance' ? 'alert' : 'status'}>
      <strong>Pemeriksaan asal foto: {integrityLabel}</strong>
      <span>{integrity?.signals.map(signal => signal.detail).join(' ') || 'Sistem akan memeriksa provenance dan tanda visual saat bantuan AI dijalankan.'}</span>
      {analysis?.provider ? <small>Analisis visual: {analysis.provider} · Percobaan: {analysis.attemptedProviders.join(' → ')}</small> : null}
    </div>
    <div className="ai-result" aria-live="polite"><strong>{draft ? `Saran: ${STATUS_META[draft.status].label}` : 'Pemeriksaan manual selalu siap'}</strong><span>{draft ? `${draft.reason} · Keyakinan: ${draft.confidence}` : 'Gunakan bantuan foto bila diinginkan, lalu tentukan kondisi sebenarnya di lapangan.'}</span></div>
    {error && <p role="status">{error}</p>}
    {analysis?.needsMorePhotos.length ? <p>Perlu foto tambahan: {analysis.needsMorePhotos.join('; ')}</p> : null}
    <div className="ai-disclaimer" role="note"><Icon name="shield" size={16} /><small>{integrity?.disclaimer ?? analysis?.disclaimer ?? 'Saran foto hanya membantu draf awal dan bukan ukuran teknis pasti. Anda yang menentukan kondisi sebenarnya di lokasi.'}</small></div>
  </div>;
}
