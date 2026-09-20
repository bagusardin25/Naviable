'use client';
import { useRef, useState } from 'react';
import type { Place } from '@/types';
import { submitReview } from '@/lib/api';

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
    if (!payload.reviewerName || payload.experience.length < 10) { setError('Isi nama dan pengalaman minimal 10 karakter.'); return; }
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setPending(true); setError('');
    try { await submitReview(payload, attempt.current.key); onSubmitted(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Review belum terkirim. Coba lagi.'); }
    finally { setPending(false); }
  }

  return <div className="page-scroll">
    <button className="secondary-action" type="button" onClick={onCancel}>← Kembali ke detail lokasi</button>
    <div className="page-title"><div><span className="eyebrow">Pengalaman pengguna</span><h1>Tulis Review</h1><p>Bagikan pengalaman Anda berkunjung ke {place.name}. Review tidak mengubah data aksesibilitas lokasi.</p></div></div>

    {!signedIn && (
      <div className="auth-prompt-banner" role="status" style={{ marginBottom: '16px' }}>
        <div>
          <strong>Masuk Diperlukan untuk Menulis Review</strong>
          <p>
            Anda perlu masuk akun terlebih dahulu sebelum dapat membagikan ulasan kunjungan di {place.name}.
          </p>
        </div>
        {onRequireAuth && (
          <button
            type="button"
            className="auth-prompt-btn"
            onClick={onRequireAuth}
          >
            Masuk / Daftar
          </button>
        )}
      </div>
    )}

    <form onSubmit={submit} className="review-form card form-card" aria-busy={pending}>
      <fieldset disabled={pending || !signedIn}>
        <legend>{place.name}</legend>
        <label htmlFor="reviewer-name">Nama Anda (ditampilkan ke publik)<input id="reviewer-name" autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <label htmlFor="review-experience">Pengalaman berkunjung<textarea id="review-experience" required minLength={10} maxLength={2000} rows={7} value={experience} onChange={e => setExperience(e.target.value)} placeholder="Apa yang membantu atau menyulitkan Anda saat berkunjung?" /></label>
        <p className="flow-help">Untuk mengoreksi kondisi pintu, ramp, atau fasilitas lainnya, gunakan “Laporkan Perubahan” di detail lokasi.</p>
        <button type="submit" className="primary-action" disabled={pending || !signedIn}>
          {pending ? 'Mengirim review…' : !signedIn ? 'Masuk untuk Mengirim Review' : 'Kirim Review'}
        </button>
      </fieldset>
      {error && <p role="alert" className="flow-error">{error}</p>}
    </form>
  </div>;
}
