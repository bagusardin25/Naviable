'use client';
import { useEffect, useState } from 'react';
import { fetchReviews, type ApiReview } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';

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
    <h3 id="reviews-heading">{t('places.reviewsHeading')}</h3>
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
      <p>{t('places.reviewsCount', { from: offset + 1, to: offset + reviews.length, total })}</p>
      {reviews.map(review => (
        <article key={review.id} className="review-entry">
          <strong>{review.reviewerName}</strong>
          <time dateTime={review.createdAt}>{formatDate(new Date(review.createdAt), { day: 'numeric', month: 'numeric', year: 'numeric' })}</time>
          <p>{review.experience}</p>
        </article>
      ))}
      <div className="flow-actions">
        {offset > 0 && <button className="secondary-action" type="button" onClick={() => load(Math.max(0, offset - 20))}>{t('places.prevPage')}</button>}
        {offset + reviews.length < total && <button className="secondary-action" type="button" onClick={() => load(offset + 20)}>{t('places.nextPage')}</button>}
      </div>
    </> : <p>{t('places.noReviewsYet')}</p>)}
    <button type="button" className="secondary-action" onClick={onWrite}>{t('places.writeReview')}</button>
    {!signedIn && <p className="flow-help">{t('places.writeReviewPrompt')}</p>}
  </section>;
}
