import Image from 'next/image';
import type { ApiAnalysis } from '@/lib/api';
import { STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

type Props = { analysis: ApiAnalysis | null; analyzing: boolean; error: string; uploadedPhotoUrl: string | null; elementCode: string };
export function AIDraftPanel({ analysis, analyzing, error, uploadedPhotoUrl, elementCode }: Props) {
  const { t } = useTranslation();
  const draft = analysis?.drafts.find(d => d.element === elementCode);
  return <div className="ai-draft-section">
    <div className="card-title-row"><div><span className="eyebrow">{t('reports.aiAssistanceEyebrow')}</span><h2>{t('reports.step2Title')}</h2></div><span className={`live-pill ${draft ? 'ready' : ''}`}>{analyzing ? t('reports.aiAnalyzing') : draft ? t('reports.aiSuggestionReady') : t('reports.aiNotChecked')}</span></div>
    <div className="vision-stage" aria-label={t('reports.aiPreviewAlt')}>{uploadedPhotoUrl ? <Image src={uploadedPhotoUrl} alt={t('reports.aiPreviewAlt')} width={280} height={140} unoptimized className="vision-preview-img" style={{ objectFit: 'contain' }} /> : <Icon name="photo" size={54} />}</div>
    <div className="ai-result" aria-live="polite"><strong>{draft ? `${t('reports.aiSuggestionLabel')} ${t(`status.${draft.status}.label`) || STATUS_META[draft.status].label}` : t('reports.aiManualAlwaysReady')}</strong><span>{draft ? `${draft.reason} · ${t('reports.confidenceLabel')} ${draft.confidence}` : t('reports.aiHelpGuidance')}</span></div>
    {error && <p role="status">{error}</p>}
    {analysis?.needsMorePhotos.length ? <p>{t('reports.aiNeedsMorePhotos')} {analysis.needsMorePhotos.join('; ')}</p> : null}
    <div className="ai-disclaimer" role="note"><Icon name="shield" size={16} /><small>{analysis?.disclaimer ?? t('reports.aiDisclaimerDefault')}</small></div>
  </div>;
}
