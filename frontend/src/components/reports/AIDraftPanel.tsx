import type { ApiAnalysis } from '@/lib/api';
import { STATUS_META } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

type Props = { analysis: ApiAnalysis | null; analyzing: boolean; error: string; elementCode: string };
export function AIDraftPanel({ analysis, analyzing, error, elementCode }: Props) {
  const { t } = useTranslation();
  const draft = analysis?.drafts.find(d => d.element === elementCode);
  const integrity = analysis?.photoIntegrity;
  const integrityLabel = integrity?.outcome === 'trusted_ai_provenance'
    ? t('reports.integrityAiTrusted')
    : integrity?.outcome === 'suspicious'
      ? t('reports.integritySuspicious')
      : integrity
        ? t('reports.integrityUncertain')
        : t('reports.integrityNotChecked');
  const integrityTone = integrity?.outcome === 'trusted_ai_provenance'
    ? 'blocked'
    : integrity?.outcome === 'suspicious'
      ? 'warning'
      : 'neutral';
  return <div className="ai-draft-section">
    <div className="card-title-row"><div><span className="eyebrow">{t('reports.aiAssistanceEyebrow')}</span><h2>{t('reports.step2Title')}</h2></div><span className={`live-pill ${draft ? 'ready' : ''}`}>{analyzing ? t('reports.aiAnalyzing') : draft ? t('reports.aiSuggestionReady') : t('reports.aiNotChecked')}</span></div>
    {integrity ? (
      <div className={`integrity-result ${integrityTone}`} role={integrity.outcome === 'trusted_ai_provenance' ? 'alert' : 'status'}>
        <strong>{t('reports.integrityCheckTitle')} {integrityLabel}</strong>
        <span>{integrity.signals.map(signal => signal.detail).join(' ') || t('reports.integrityDefaultSignals')}</span>
        {analysis?.provider ? <small>{t('reports.visualAnalysisLabel')} {analysis.provider} · {t('reports.attemptsLabel')} {analysis.attemptedProviders.join(' → ')}</small> : null}
      </div>
    ) : null}
    <div className="ai-result" aria-live="polite"><strong>{draft ? `${t('reports.aiSuggestionLabel')} ${t(`status.${draft.status}.label`) || STATUS_META[draft.status].label}` : t('reports.aiManualAlwaysReady')}</strong><span>{draft ? `${draft.reason} · ${t('reports.confidenceLabel')} ${draft.confidence}` : t('reports.aiHelpGuidance')}</span></div>
    {error && <p role="status">{error}</p>}
    {analysis?.needsMorePhotos.length ? <p>{t('reports.aiNeedsMorePhotos')} {analysis.needsMorePhotos.join('; ')}</p> : null}
    <div className="ai-disclaimer" role="note"><Icon name="shield" size={16} /><small>{integrity?.disclaimer ?? analysis?.disclaimer ?? t('reports.aiDisclaimerDefault')}</small></div>
  </div>;
}
