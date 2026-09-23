import type { ApiAnalysis } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';

type Props = { analysis: ApiAnalysis | null; analyzing: boolean; error: string };
// Contributors only see what the AI saw in their photo. Provenance signals, per-element drafts
// and provider details stay with the reviewer; a blocked photo is explained next to the submit button.
export function AIDraftPanel({ analysis, analyzing, error }: Props) {
  const { t } = useTranslation();
  const statusText = analyzing
    ? t('reports.aiAnalyzingHint')
    : error || (analysis ? t('reports.aiNoDescription') : t('reports.aiHelpGuidance'));
  return <div className="ai-draft-section">
    <div className="card-title-row"><div><span className="eyebrow">{t('reports.aiAssistanceEyebrow')}</span><h2>{t('reports.step2Title')}</h2></div><span className={`live-pill ${analysis ? 'ready' : ''}`}>{analyzing ? t('reports.aiAnalyzing') : analysis ? t('reports.aiChecked') : t('reports.aiNotChecked')}</span></div>
    {/* Announced to screen readers too: a blind contributor hears what the AI sees in their photo. */}
    {analysis?.description ? (
      <div className="ai-photo-description" aria-live="polite">
        <strong>{t('reports.aiPhotoDescriptionLabel')}</strong>
        <p>{analysis.description}</p>
      </div>
    ) : (
      <p className="ai-panel-status" role="status">{statusText}</p>
    )}
  </div>;
}
