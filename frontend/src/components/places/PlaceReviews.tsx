'use client';
import { useEffect, useState } from 'react';
import { fetchReviews, type ApiReview } from '@/lib/api';

export function PlaceReviews({ placeId, onWrite, signedIn }: { placeId: string; onWrite: () => void; signedIn: boolean }) {
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
    <h3 id="reviews-heading">Review Pengunjung</h3>
    <p className="flow-help">Pengalaman pribadi pengunjung, terpisah dari laporan perubahan kondisi.</p>
    {state === 'loading' && <p role="status">Memuat review…</p>}
    {state === 'error' && <p role="alert">Review belum dapat dimuat. <button type="button" onClick={() => { setState('loading'); setAttempt(n => n + 1); }}>Coba lagi</button></p>}
    {state === 'ready' && (reviews.length ? <>
      <p>{offset + 1}–{offset + reviews.length} dari {total} review</p>
      {reviews.map(review => <article key={review.id} className="review-entry"><strong>{review.reviewerName}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('id-ID')}</time><p>{review.experience}</p></article>)}
      <div className="flow-actions">{offset > 0 && <button className="secondary-action" type="button" onClick={() => load(Math.max(0, offset - 20))}>Sebelumnya</button>}{offset + reviews.length < total && <button className="secondary-action" type="button" onClick={() => load(offset + 20)}>Berikutnya</button>}</div>
    </> : <p>Belum ada review pengalaman untuk lokasi ini.</p>)}
    <button type="button" className="secondary-action" onClick={onWrite}>Tulis Review</button>
    {!signedIn && <p className="flow-help">Masuk diperlukan untuk menulis review.</p>}
  </section>;
}
