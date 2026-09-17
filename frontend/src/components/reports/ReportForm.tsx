'use client';

import React, { useRef, useState } from 'react';
import { Place, ChainElementCode, AccessibilityStatus, CHAIN_ELEMENT_MAP } from '@/types';
import { analyzePhoto, submitReport, type ApiAnalysis, type ReportPayload } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { AIDraftPanel } from './AIDraftPanel';
import { HumanLockSelector } from './HumanLockSelector';

type ReportFormProps = { places: Place[]; defaultPlaceName?: string; onSubmitReport: (place: Place) => void };
export function ReportForm({ places, defaultPlaceName, onSubmitReport }: ReportFormProps) {
  const initial = places.find(p => p.name === defaultPlaceName) ?? places[0];
  const [placeId, setPlaceId] = useState(String(initial?.id ?? ''));
  const [reporterName, setReporterName] = useState('');
  const [elementCode, setElementCode] = useState<ChainElementCode>('E5');
  const [status, setStatus] = useState<AccessibilityStatus>('BELUM_DIKETAHUI');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ image: string; mimeType: string } | null>(null);
  const [analysis, setAnalysis] = useState<ApiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reading, setReading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const busy = submitting || reading;

  function readPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setAnalysis(null); setAiError(''); setConfirmed(false); setError(''); setPhoto(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Gunakan foto JPG, PNG, atau WebP maksimal 5 MB.'); return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => { setPhoto({ image: String(reader.result), mimeType: file.type }); setReading(false); };
    reader.onerror = () => { setError('Foto tidak dapat dibaca. Silakan pilih ulang.'); setReading(false); };
    reader.readAsDataURL(file);
  }
  async function analyze() {
    if (!photo || analyzing) return;
    setAnalyzing(true); setAiError('');
    try { setAnalysis(await analyzePhoto(photo.image, photo.mimeType)); }
    catch (e) { setAnalysis(null); setAiError(e instanceof Error ? e.message : 'AI tidak tersedia. Checklist manual tetap dapat digunakan.'); }
    finally { setAnalyzing(false); }
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!photo || !confirmed) { setError('Unggah foto dan konfirmasi checklist terlebih dahulu.'); return; }
    const payload: ReportPayload = { placeId, reporterName, ...photo, humanConfirmed: true, elements: [{ element: CHAIN_ELEMENT_MAP[elementCode].codeName, status, note }] };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setSubmitting(true); setError('');
    try { const result = await submitReport(payload, attempt.current.key); onSubmitReport(result.place); }
    catch (e) { setError(e instanceof Error ? e.message : 'Laporan belum tersimpan. Coba lagi.'); }
    finally { setSubmitting(false); }
  }
  return (
    <div className="page-scroll">
      <div className="page-title"><div><span className="eyebrow">Pelaporan bukti lapangan</span><h1>Foto → Draf AI → Kunci Manusia</h1><p>AI membantu mengisi draf. Anda memeriksa kondisi lapangan dan mengunci status akhir.</p><p>Untuk layanan online, <a href="/login">masuk sebagai kontributor</a>.</p></div></div>
      <form onSubmit={publish} className="report-grid" aria-busy={busy}>
        <fieldset disabled={busy || analyzing} className="card form-card" style={{ minWidth: 0 }}>
          <h2>1. Bukti Lapangan</h2>
          <label htmlFor="report-location-select">Lokasi Fasilitas<select id="report-location-select" value={placeId} onChange={e => { setPlaceId(e.target.value); setConfirmed(false); }} required><option value="" disabled>Pilih lokasi</option>{places.map(p => <option key={p.id} value={String(p.id)}>{p.name} ({p.district})</option>)}</select></label>
          <label htmlFor="reporter-name">Nama publik kontributor<input id="reporter-name" value={reporterName} onChange={e => setReporterName(e.target.value)} maxLength={80} required autoComplete="name" /></label>
          <label htmlFor="report-element-select">Elemen yang dilaporkan<select id="report-element-select" value={elementCode} onChange={e => { setElementCode(e.target.value as ChainElementCode); setStatus('BELUM_DIKETAHUI'); setConfirmed(false); }} required>{(Object.keys(CHAIN_ELEMENT_MAP) as ChainElementCode[]).map(code => <option key={code} value={code}>{code} — {CHAIN_ELEMENT_MAP[code].label}</option>)}</select></label>
          <label htmlFor="file-upload-input">Foto Bukti Lapangan<input type="file" id="file-upload-input" accept="image/jpeg,image/png,image/webp" onChange={readPhoto} required /><small>JPG, PNG, WebP · maksimal 5 MB. Gunakan foto fasilitas tanpa identitas pribadi.</small></label>
          <label htmlFor="report-notes">Catatan Lapangan<textarea id="report-notes" value={note} maxLength={1000} onChange={e => { setNote(e.target.value); setConfirmed(false); }} placeholder="Jelaskan kondisi yang Anda amati di lokasi." rows={4} /></label>
        </fieldset>
        <section className="card ai-card" aria-label="Analisis dan konfirmasi manusia">
          <AIDraftPanel analysis={analysis} analyzing={analyzing} error={aiError} uploadedPhotoUrl={photo?.image ?? null} elementCode={CHAIN_ELEMENT_MAP[elementCode].codeName} />
          <button type="button" className="secondary-action" onClick={analyze} disabled={!photo || analyzing || busy}><Icon name="photo" />{analyzing ? 'Menganalisis…' : 'Bantu isi draf dengan AI (opsional)'}</button>
          <fieldset disabled={busy || analyzing} style={{ border: 0, padding: 0, minWidth: 0 }}>
            <HumanLockSelector currentStatus={status} onSelectStatus={s => { setStatus(s); setConfirmed(false); }} />
            <label style={{ display: 'flex', gap: '8px', marginTop: '16px' }}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />Saya telah memeriksa foto dan kondisi lapangan serta mengonfirmasi status elemen yang dipilih.</label>
          </fieldset>
          <button id="btn-submit-report" type="submit" className="primary-action" style={{ width: '100%', marginTop: '20px' }} disabled={busy || analyzing || !photo || !confirmed || !placeId}>{submitting ? 'Menyimpan laporan…' : 'Publish Setelah Konfirmasi Manusia'}</button>
          {error && <p role="alert">{error}</p>}
        </section>
      </form>
    </div>
  );
}
