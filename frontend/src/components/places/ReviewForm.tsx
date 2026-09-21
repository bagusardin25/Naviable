'use client';
import { useRef, useState } from 'react';
import type { Place } from '@/types';
import { submitReview } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';

export function ReviewForm({
  place,
  signedIn = false,
  defaultAuthorName = '',
  onRequireAuth,
  onCancel,
  onSubmitted,
}: {
  place: Place;
  signedIn?: boolean;
  defaultAuthorName?: string;
  onRequireAuth?: () => void;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultAuthorName);
  const [experience, setExperience] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!signedIn) {
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }
    const payload = { placeId: String(place.id), reviewerName: name.trim(), experience: experience.trim() };
    if (!payload.reviewerName || payload.experience.length < 10) { setError(t('places.reviewValidationMin')); return; }
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setPending(true); setError('');
    try { await submitReview(payload, attempt.current.key); onSubmitted(); }
    catch (e) { setError(e instanceof Error ? e.message : t('places.reviewErrorFallback')); }
    finally { setPending(false); }
  }

  return <div className="page-scroll">
    <button className="secondary-action" type="button" onClick={onCancel}>{t('places.backToDetail')}</button>
    <div className="page-title"><div><span className="eyebrow">{t('places.userExperienceEyebrow')}</span><h1>{t('places.reviewTitle')}</h1><p>{t('places.reviewDescription', { name: place.name })}</p></div></div>

    {!signedIn && (
      <div className="auth-prompt-banner" role="status" style={{ marginBottom: '16px' }}>
        <div>
          <strong>{t('places.reviewAuthNoticeTitle')}</strong>
          <p>
            {t('places.reviewAuthNoticeDesc', { name: place.name })}
          </p>
        </div>
        {onRequireAuth && (
          <button
            type="button"
            className="auth-prompt-btn"
            onClick={onRequireAuth}
          >
            {t('places.authPromptBtn')}
          </button>
        )}
      </div>
    )}

    <form onSubmit={submit} className="review-form card form-card" aria-busy={pending}>
      <fieldset disabled={pending || !signedIn}>
        <legend>{place.name}</legend>
        <label htmlFor="reviewer-name">{t('places.yourNameLabel')}<input id="reviewer-name" autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <label htmlFor="review-experience">{t('places.experienceLabel')}<textarea id="review-experience" required minLength={10} maxLength={2000} rows={7} value={experience} onChange={e => setExperience(e.target.value)} placeholder={t('places.experiencePlaceholder')} /></label>
        <p className="flow-help">{t('places.reviewHelpText')}</p>
        <button type="submit" className="primary-action" disabled={pending || !signedIn}>
          {pending ? t('places.submittingReview') : !signedIn ? t('places.signInToReview') : t('places.submitReviewBtn')}
        </button>
      </fieldset>
      {error && <p role="alert" className="flow-error">{error}</p>}
    </form>
  </div>;
}
