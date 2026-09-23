'use client';
import { useEffect, useState } from 'react';
import { fetchReviews, type ApiReview } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

const PAGE_SIZE = 20;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)).toUpperCase();
}

export function PlaceReviews({ placeId, onWrite, signedIn }: { placeId: string; onWrite: () => void; signedIn: boolean }) {
  const { t, formatDate } = useTranslation();
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    fetchReviews(placeId, offset).then(result => {
      if (!active) return;
      setReviews(result.reviews); setTotal(result.total); setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [placeId, offset, attempt]);

  function load(next: number) { setState('loading'); setOffset(next); }

  return <section className="place-reviews" aria-labelledby="reviews-heading">
    <div className="place-reviews-header">
      <h3 id="reviews-heading">{t('places.reviewsHeading')}</h3>
      {state === 'ready' && total > 0 && <span className="count-pill">{t('places.reviewsTotal', { total })}</span>}
    </div>
    <p className="flow-help">{t('places.visitorReviewsHelp')}</p>
    {state === 'loading' && <p role="status">{t('places.loadingReviews')}</p>}
    {state === 'error' && (
      <p role="alert">
        {t('places.errorReviews')}{' '}
        <button type="button" onClick={() => { setState('loading'); setAttempt(n => n + 1); }}>
          {t('places.retryBtn')}
        </button>
      </p>
    )}
    {state === 'ready' && (reviews.length ? <>
      {total > PAGE_SIZE && <p className="flow-help">{t('places.reviewsCount', { from: offset + 1, to: offset + reviews.length, total })}</p>}
      <ol className="review-list">
        {reviews.map(review => (
          <li key={review.id}>
            <article className="review-card" aria-label={t('places.reviewByAria', { name: review.reviewerName })}>
              <header className="review-card-header">
                <span className="review-avatar" aria-hidden="true">{initials(review.reviewerName)}</span>
                <div className="review-card-meta">
                  <strong>{review.reviewerName}</strong>
                  <span>
                    {t('places.visitorReviewLabel')} ·{' '}
                    <time dateTime={review.createdAt}>{formatDate(new Date(review.createdAt), { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                  </span>
                </div>
              </header>
              <p className="review-card-body">{review.experience}</p>
            </article>
          </li>
        ))}
      </ol>
      {total > PAGE_SIZE && (
        <div className="flow-actions">
          {offset > 0 && <button className="secondary-action" type="button" onClick={() => load(Math.max(0, offset - PAGE_SIZE))}>{t('places.prevPage')}</button>}
          {offset + reviews.length < total && <button className="secondary-action" type="button" onClick={() => load(offset + PAGE_SIZE)}>{t('places.nextPage')}</button>}
        </div>
      )}
    </> : <p className="review-empty">{t('places.noReviewsYet')}</p>)}
    <button type="button" className="secondary-action review-write-btn" onClick={onWrite}>
      <Icon name="plus" size={15} />
      <span>{t('places.writeReview')}</span>
    </button>
    {!signedIn && <p className="flow-help">{t('places.writeReviewPrompt')}</p>}
  </section>;
}
