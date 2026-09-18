'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Place, ChainElementCode, AccessibilityStatus, CHAIN_ELEMENT_MAP } from '@/types';
import { analyzePhoto, submitReport, type ApiAnalysis, type ReportPayload } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { AIDraftPanel } from './AIDraftPanel';
import { HumanLockSelector } from './HumanLockSelector';

type DraftData = {
  placeId?: string;
  reporterName?: string;
  elementCode?: ChainElementCode;
  status?: AccessibilityStatus;
  note?: string;
};

function readLocalDraft(): DraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('naviable_report_draft_v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

type ReportFormProps = { places: Place[]; defaultPlaceName?: string; onSubmitReport: (place: Place) => void };
export function ReportForm({ places, defaultPlaceName, onSubmitReport }: ReportFormProps) {
  const initial = places.find(p => p.name === defaultPlaceName) ?? places[0];
  const draft = readLocalDraft();

  const [placeId, setPlaceId] = useState<string>(
    draft?.placeId && places.some(p => String(p.id) === draft.placeId)
      ? draft.placeId
      : String(initial?.id ?? '')
  );
  const [reporterName, setReporterName] = useState<string>(draft?.reporterName ?? '');
  const [elementCode, setElementCode] = useState<ChainElementCode>(
    draft?.elementCode && CHAIN_ELEMENT_MAP[draft.elementCode] ? draft.elementCode : 'E5'
  );
  const [status, setStatus] = useState<AccessibilityStatus>(draft?.status ?? 'BELUM_DIKETAHUI');
  const [note, setNote] = useState<string>(draft?.note ?? '');
  const [draftRestored, setDraftRestored] = useState<boolean>(
    Boolean(draft && (draft.reporterName || draft.note || draft.placeId))
  );
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


  // Persist draft on edit
  useEffect(() => {
    if (!placeId && !reporterName && !note) return;
    try {
      localStorage.setItem(
        'naviable_report_draft_v1',
        JSON.stringify({
          placeId,
          reporterName,
          elementCode,
          status,
          note,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [placeId, reporterName, elementCode, status, note]);

  function clearDraft() {
    try {
      localStorage.removeItem('naviable_report_draft_v1');
    } catch {
      // ignore
    }
    setReporterName('');
    setNote('');
    setStatus('BELUM_DIKETAHUI');
    setDraftRestored(false);
  }

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
    catch (e) { setAnalysis(null); setAiError(e instanceof Error ? e.message : 'Bantuan foto sedang tidak tersedia. Anda tetap bisa mengisi checklist secara manual.'); }
    finally { setAnalyzing(false); }
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!photo || !confirmed) { setError('Unggah foto dan centang konfirmasi kondisi terlebih dahulu.'); return; }
    const payload: ReportPayload = { placeId, reporterName, ...photo, humanConfirmed: true, elements: [{ element: CHAIN_ELEMENT_MAP[elementCode].codeName, status, note }] };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setSubmitting(true); setError('');
    try {
      const result = await submitReport(payload, attempt.current.key);
      try {
        localStorage.removeItem('naviable_report_draft_v1');
      } catch {
        // ignore
      }
      onSubmitReport(result.place);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Laporan belum berhasil dikirim. Silakan coba lagi.'); }
    finally { setSubmitting(false); }
  }
  return (
    <div className="page-scroll">
      <div className="page-title"><div><span className="eyebrow">Lapor Kondisi Akses</span><h1>Laporkan Kondisi Akses</h1><p>Bagikan foto dan informasi terkini agar kawan disabilitas dapat bepergian dengan aman dan mandiri.</p><p>Ingin rekam riwayat kontribusi Anda? <a href="/login">Masuk ke akun kontributor</a>.</p></div></div>
      {draftRestored && (
        <div
          role="status"
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💾</span>
            <span>Draf laporan sebelumnya tersimpan otomatis di perangkat ini.</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            style={{
              background: 'transparent',
              border: '1px solid #93c5fd',
              color: '#1d4ed8',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Hapus Draf
          </button>
        </div>
      )}
      <form onSubmit={publish} className="report-grid" aria-busy={busy}>
        <fieldset disabled={busy || analyzing} className="card form-card" style={{ minWidth: 0 }}>
          <h2>1. Informasi & Foto Lokasi</h2>
          <label htmlFor="report-location-select">
            Nama Tempat / Fasilitas
            <select id="report-location-select" value={placeId} onChange={e => { setPlaceId(e.target.value); setConfirmed(false); }} required>
              <option value="" disabled>Pilih lokasi tempat</option>
              {places.map(p => <option key={p.id} value={String(p.id)}>{p.name} ({p.district})</option>)}
            </select>
          </label>
          <label htmlFor="reporter-name">
            Nama Anda (ditampilkan ke publik)
            <input type="text" id="reporter-name" value={reporterName} onChange={e => setReporterName(e.target.value)} maxLength={80} placeholder="Contoh: Budi Santoso" required autoComplete="name" />
          </label>
          <label htmlFor="report-element-select">
            Bagian yang dilaporkan
            <select id="report-element-select" value={elementCode} onChange={e => { setElementCode(e.target.value as ChainElementCode); setStatus('BELUM_DIKETAHUI'); setConfirmed(false); }} required>
              {(Object.keys(CHAIN_ELEMENT_MAP) as ChainElementCode[]).map(code => <option key={code} value={code}>{code} — {CHAIN_ELEMENT_MAP[code].label}</option>)}
            </select>
          </label>
          <div>
            <span className="field-label-text">Foto Kondisi di Lapangan</span>
            <label htmlFor="file-upload-input" className="upload-box" aria-label="Unggah foto kondisi di lapangan">
              <Icon name="camera" size={26} />
              {photo ? (
                <div className="upload-preview-badge">
                  <span>✓ Foto tersimpan (klik untuk ganti)</span>
                </div>
              ) : (
                <>
                  <span>Klik atau seret foto ke sini</span>
                  <small>Format JPG, PNG, atau WebP · maks 5 MB</small>
                </>
              )}
              <input type="file" id="file-upload-input" accept="image/jpeg,image/png,image/webp" onChange={readPhoto} required />
            </label>
          </div>
          <label htmlFor="report-notes">
            Catatan Tambahan (opsional)
            <textarea id="report-notes" value={note} maxLength={1000} onChange={e => { setNote(e.target.value); setConfirmed(false); }} placeholder="Ceritakan kondisi yang Anda temui (misal: ramp terlalu curam, pintu darurat terkunci, jalan berlubang)." rows={4} />
          </label>
        </fieldset>
        <section className="card ai-card" aria-label="Pemeriksaan dan konfirmasi">
          <AIDraftPanel analysis={analysis} analyzing={analyzing} error={aiError} uploadedPhotoUrl={photo?.image ?? null} elementCode={CHAIN_ELEMENT_MAP[elementCode].codeName} />
          <button type="button" className="secondary-action" onClick={analyze} disabled={!photo || analyzing || busy}><Icon name="photo" />{analyzing ? 'Memeriksa foto…' : 'Bantu kenali kondisi dengan AI (opsional)'}</button>
          <fieldset disabled={busy || analyzing} style={{ border: 0, padding: 0, minWidth: 0 }}>
            <HumanLockSelector currentStatus={status} onSelectStatus={s => { setStatus(s); setConfirmed(false); }} />
            <label style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'flex-start', fontSize: '12px' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required style={{ marginTop: '2px' }} />
              <span>Saya sudah memeriksa foto dan memastikan kondisi ini sesuai dengan yang ada di lokasi.</span>
            </label>
          </fieldset>
          <button id="btn-submit-report" type="submit" className="primary-action" style={{ width: '100%', marginTop: '20px' }} disabled={busy || analyzing || !photo || !confirmed || !placeId}>{submitting ? 'Mengirim laporan…' : 'Kirim Laporan'}</button>
          {error && <p role="alert" style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginTop: '12px', border: '1px solid #fecaca' }}>{error}</p>}
        </section>
      </form>
    </div>
  );
}
