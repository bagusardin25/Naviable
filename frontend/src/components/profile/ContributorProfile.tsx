'use client';
import { useEffect, useState } from 'react';
import { fetchContributions, type ContributionReport } from '@/lib/api';
import { markReviewsSeen, unseenReviewIds } from '@/lib/contributionUpdates';
import { supabaseBrowser } from '@/lib/supabase';
import type { AuthUserProfile } from '@/lib/auth/user-profile';
import { useTranslation } from '@/hooks/useTranslation';

// Status chip styling per review outcome. Pending/approved/needs-revision/rejected each read distinctly.
const STATUS_STYLES: Record<string, { labelKey: string; bg: string; border: string; ink: string }> = {
  SUBMITTED: { labelKey: 'profile.statusPending', bg: '#fef3c7', border: '#fde68a', ink: '#92400e' },
  UNDER_REVIEW: { labelKey: 'profile.statusPending', bg: '#fef3c7', border: '#fde68a', ink: '#92400e' },
  APPROVED: { labelKey: 'profile.statusApproved', bg: '#dcfce7', border: '#bbf7d0', ink: '#166534' },
  PUBLISHED: { labelKey: 'profile.statusApproved', bg: '#dcfce7', border: '#bbf7d0', ink: '#166534' },
  NEEDS_REVISION: { labelKey: 'profile.statusNeedsRevision', bg: '#ffedd5', border: '#fed7aa', ink: '#9a3412' },
  REJECTED: { labelKey: 'profile.statusRejected', bg: '#fee2e2', border: '#fecaca', ink: '#991b1b' },
  DRAFT: { labelKey: 'profile.statusDraft', bg: '#f1f5f9', border: '#e2e8f0', ink: '#475569' },
};

// Reviewer checklist items reuse the reviewer-side labels so wording stays consistent.
const CHECK_LABEL_KEYS: Record<string, string> = {
  photoMatchesPlace: 'reviewer.check1',
  photoShowsElement: 'reviewer.check2',
  descriptionMatchesEvidence: 'reviewer.check3',
  notDuplicate: 'reviewer.check4',
  accessStatusMatchesEvidence: 'reviewer.check5',
};

export function ContributorProfile({ userProfile, onSignedOut, onReviewsSeen }: { userProfile: AuthUserProfile; onSignedOut: () => void; onReviewsSeen?: () => void }) {
  const { t, formatDate } = useTranslation();
  const [data, setData] = useState<{ mode: string; total: number; reports: ContributionReport[] } | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetchContributions()
      .then(value => {
        if (!active) return;
        // Capture what is new for THIS view, then mark seen so the nav badge clears.
        setNewIds(unseenReviewIds(value.reports));
        setData(value);
        markReviewsSeen(value.reports);
        onReviewsSeen?.();
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : t('profile.loadError')); });
    return () => { active = false; };
  }, [reload, t, onReviewsSeen]);

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { error: signOutError } = await supabaseBrowser().auth.signOut({ scope: 'local' });
        if (signOutError) throw signOutError;
      }
      onSignedOut();
    } catch {
      setError(t('profile.signOutError'));
      setSigningOut(false);
    }
  }

  return (
    <div className="page-scroll profile-page">
      <section className="profile-hero">
        <div className="avatar large" aria-hidden="true">{userProfile.initials}</div>
        <div className="profile-identity">
          <span className="eyebrow">{userProfile.providerLabel}</span>
          <h1>{userProfile.displayName}</h1>
          <p className="profile-email">{userProfile.email}</p>
          <p>{t('profile.subtitle')}</p>
        </div>
      </section>

      <button type="button" className="secondary-action" onClick={signOut} disabled={signingOut}>
        {signingOut ? t('profile.signingOutBtn') : t('profile.signOutBtn')}
      </button>

      {error && (
        <p role="alert" style={{ color: 'var(--notice-error-ink)', background: 'var(--notice-error-bg)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginTop: '16px', border: '1px solid var(--notice-error-border)' }}>
          {error}{' '}
          <button type="button" className="text-action" onClick={() => { setData(null); setError(''); setReload(value => value + 1); }}>
            {t('common.retry')}
          </button>
        </p>
      )}

      {!data && !error && <p role="status" style={{ padding: '24px 0', color: 'var(--muted)' }}>{t('profile.loadingHistory')}</p>}

      {data && newIds.size > 0 && (
        <p role="status" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '10px', padding: '10px 14px', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
          {t('profile.newUpdatesBanner', { count: newIds.size })}
        </p>
      )}

      {data && (
        <div className="profile-grid">
          <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2>{t('profile.submittedReportsCard')}</h2>
            <strong className="big-number">{data.total}</strong>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 16px' }}>
              {t('profile.submittedReportsSub')}
            </p>
          </article>

          <article className="card">
            <div className="card-title-row" style={{ marginBottom: '12px' }}>
              <h2>{t('profile.latestReportsCard')}</h2>
              <span className="count-pill">{t('profile.reportsCountPill', { count: data.reports.length })}</span>
            </div>
            {data.reports.length ? (
              <div style={{ display: 'grid', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {data.reports.map((r) => {
                  const meta = STATUS_STYLES[r.reviewStatus ?? 'SUBMITTED'] ?? STATUS_STYLES.SUBMITTED;
                  const failedChecks = r.reviewChecklist
                    ? Object.entries(r.reviewChecklist).filter(([, ok]) => ok === false).map(([key]) => key)
                    : [];
                  const showNote = Boolean(r.reviewNote && r.reviewNote.trim());
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--surface-secondary)',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>{r.placeName || r.reporterName}</span>
                        <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {newIds.has(r.id) && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap', background: '#dbeafe', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                              {t('profile.newTag')}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap', background: meta.bg, border: `1px solid ${meta.border}`, color: meta.ink }}>
                            {t(meta.labelKey)}
                          </span>
                        </span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                        {t('profile.conditionPrefix')}{' '}
                        {r.elements.map((e) => t(`status.${e.status}.label`) || e.status).join(', ')}
                        {' · '}
                        {formatDate(new Date(r.createdAt), { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      </div>
                      {showNote && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          <strong style={{ fontWeight: 700 }}>{t('profile.reviewerNoteLabel')}</strong>{' '}
                          <span>{r.reviewNote}</span>
                        </div>
                      )}
                      {failedChecks.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          <strong style={{ fontWeight: 700 }}>{t('profile.checklistIssuesLabel')}</strong>
                          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                            {failedChecks.map((key) => (
                              <li key={key}>{t(CHECK_LABEL_KEYS[key] ?? '') || key}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px' }}>
                {t('profile.noReportsYet')}
              </p>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
