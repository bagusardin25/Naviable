import Image from 'next/image';
import type { ApiAnalysis } from '@/lib/api';
import { STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';

type Props = { analysis: ApiAnalysis | null; analyzing: boolean; error: string; uploadedPhotoUrl: string | null; elementCode: string };
export function AIDraftPanel({ analysis, analyzing, error, uploadedPhotoUrl, elementCode }: Props) {
  const draft = analysis?.drafts.find(d => d.element === elementCode);
  return <div className="ai-draft-section">
    <div className="card-title-row"><div><span className="eyebrow">AI Assistant</span><h2>2. Draf Analisis Gambar</h2></div><span className={`live-pill ${draft ? 'ready' : ''}`}>{analyzing ? 'Menganalisis…' : draft ? 'Draf siap' : 'Belum dianalisis'}</span></div>
    <div className="vision-stage" aria-label="Pratinjau foto bukti">{uploadedPhotoUrl ? <Image src={uploadedPhotoUrl} alt="Foto bukti lapangan yang diunggah" width={280} height={140} unoptimized className="vision-preview-img" style={{ objectFit: 'contain' }} /> : <Icon name="photo" size={54} />}</div>
    <div className="ai-result" aria-live="polite"><strong>{draft ? `Saran draf: ${STATUS_META[draft.status].label}` : 'Checklist manual tetap tersedia'}</strong><span>{draft ? `${draft.reason} · Keyakinan: ${draft.confidence}` : 'Pilih analisis AI jika diperlukan, lalu tetapkan status berdasarkan pengamatan Anda.'}</span></div>
    {error && <p role="status">{error}</p>}
    {analysis?.needsMorePhotos.length ? <p>Foto tambahan: {analysis.needsMorePhotos.join('; ')}</p> : null}
    <div className="ai-disclaimer" role="note"><Icon name="shield" size={16} /><small>{analysis?.disclaimer ?? 'AI menghasilkan draf, bukan pengukuran cm/kemiringan atau penilaian kepatuhan hukum. Status tidak diterapkan otomatis.'}</small></div>
  </div>;
}
