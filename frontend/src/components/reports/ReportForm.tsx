'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Place, ChainElementCode, AccessibilityStatus, CHAIN_ELEMENT_MAP, STATUS_META } from '@/types';
import { analyzePhoto, submitReport, submitNewPlace, type ApiAnalysis, type ReportPayload, type NewLocation } from '@/lib/api';
import { placeHref } from '@/lib/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { AIDraftPanel } from './AIDraftPanel';
import { HumanLockSelector } from './HumanLockSelector';

type DraftData = {
  placeId?: string;
  reporterName?: string;
  elementCode?: ChainElementCode;
  status?: AccessibilityStatus;
  note?: string;
  location?: NewLocation;
};

function readLocalDraft(key: string): DraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

type ReportFormProps = {
  places: Place[];
  mode: 'add' | 'correction';
  targetPlace?: Place;
  initialLocation?: {
    lat: number;
    lng: number;
    name?: string;
    category?: string;
    address?: string;
  };
  draftOwner: string;
  signedIn?: boolean;
  onRequireAuth?: () => void;
  onCancel: () => void;
  onSubmitReport: (place: Place) => void;
};
export function ReportForm({
  places,
  mode,
  targetPlace,
  initialLocation,
  draftOwner,
  signedIn = false,
  onRequireAuth,
  onCancel,
  onSubmitReport,
}: ReportFormProps) {
  const adding = mode === 'add';
  const placeId = adding ? '' : String(targetPlace?.id ?? '');
  const draftKey = `naviable_report_draft_v2:${draftOwner}:${mode}:${placeId}`;
  const [draft] = useState(() => readLocalDraft(draftKey));
  const hasMapCoordinates = Boolean(
    initialLocation &&
    typeof initialLocation.lat === 'number' &&
    typeof initialLocation.lng === 'number'
  );
  const [location, setLocation] = useState<NewLocation>(() => {
    if (hasMapCoordinates && initialLocation) {
      return {
        name: draft?.location?.name ?? initialLocation.name ?? '',
        category: draft?.location?.category ?? initialLocation.category ?? '',
        address: draft?.location?.address ?? initialLocation.address ?? '',
        lat: initialLocation.lat,
        lng: initialLocation.lng,
      };
    }
    return draft?.location ?? { name: '', category: '', address: '', lat: -7.2575, lng: 112.7521 };
  });
  const [coordinatesConfirmed, setCoordinatesConfirmed] = useState<boolean>(hasMapCoordinates);
  const [reporterName, setReporterName] = useState<string>(draft?.reporterName ?? '');
  const [elementCode, setElementCode] = useState<ChainElementCode>(
    draft?.elementCode && CHAIN_ELEMENT_MAP[draft.elementCode] ? draft.elementCode : 'E5'
  );
  const [status, setStatus] = useState<AccessibilityStatus>(draft?.status && STATUS_META[draft.status] ? draft.status : 'BELUM_DIKETAHUI');
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
  const [submittedSuccessPlace, setSubmittedSuccessPlace] = useState<Place | null>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const busy = submitting || reading;
  const currentElement = targetPlace?.elements.find(element => element.code === elementCode);
  const similarPlaces = adding && location.name.trim().length >= 3 ? places.filter(p => p.name.toLowerCase().includes(location.name.trim().toLowerCase())).slice(0, 5) : [];


  // Persist draft on edit
  useEffect(() => {
    if (!placeId && !reporterName && !note) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          placeId,
          reporterName,
          elementCode,
          status,
          note,
          location,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [draftKey, placeId, reporterName, elementCode, status, note, location]);

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setReporterName('');
    setNote('');
    setStatus('BELUM_DIKETAHUI');
    setDraftRestored(false);
    setConfirmed(false);
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
    if (!signedIn) {
      if (onRequireAuth) {
        onRequireAuth();
        return;
      }
    }
    if (!photo || !confirmed) { setError('Unggah foto dan centang konfirmasi kondisi terlebih dahulu.'); return; }
    if (adding && !coordinatesConfirmed) { setError('Periksa dan konfirmasi titik koordinat lokasi baru.'); return; }
    const evidence = { reporterName, ...photo, humanConfirmed: true as const, elements: [{ element: CHAIN_ELEMENT_MAP[elementCode].codeName, status, note }] };
    const payload: ReportPayload = { placeId, ...evidence };
    const newPayload = { ...evidence, location };
    const signature = JSON.stringify(adding ? newPayload : payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setSubmitting(true); setError('');
    try {
      const result = adding ? await submitNewPlace(newPayload, attempt.current.key) : await submitReport(payload, attempt.current.key);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      setSubmittedSuccessPlace(result.place);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Laporan belum berhasil dikirim. Silakan coba lagi.'); }
    finally { setSubmitting(false); }
  }

  if (submittedSuccessPlace) {
    return (
      <div className="page-scroll">
        <div className="card form-card" style={{ maxWidth: '560px', margin: '40px auto', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--notice-warning-bg)', border: '1px solid var(--notice-warning-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--orange)' }}>
            <Icon name="check" size={28} />
          </div>
          <span className="eyebrow" style={{ color: 'var(--orange)', fontWeight: 700 }}>Status Laporan</span>
          <h1 style={{ fontSize: '1.4rem', margin: '6px 0 12px', color: 'var(--ink)' }}>MENUNGGU REVIEW</h1>
          <p style={{ color: 'var(--ink)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '16px' }}>
            Laporan untuk <strong>{submittedSuccessPlace.name}</strong> telah berhasil dikirim ke antrean review Naviable.
          </p>
          <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'left' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--ink)' }}>
              Proses Kurasi & Verifikasi:
            </p>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Reviewer Naviable akan memeriksa bukti foto, kesesuaian elemen akses, dan titik lokasi sebelum laporan dipublikasikan sebagai data terverifikasi (Bukti telah diperiksa).
            </p>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => onSubmitReport(submittedSuccessPlace)}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            Selesai & Buka Peta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">

      <button type="button" className="secondary-action" onClick={onCancel}>← {adding ? 'Kembali ke Jelajahi' : 'Kembali ke detail lokasi'}</button>
      <div className="page-title"><div><span className="eyebrow">Kontribusi warga</span><h1>{adding ? 'Tambah Lokasi Baru' : 'Laporkan Perubahan'}</h1><p>{adding ? 'Untuk tempat yang belum ada di Naviable. Periksa nama lokasi agar tidak membuat duplikat, lalu tambahkan bukti kondisi awal.' : `Koreksi informasi aksesibilitas ${targetPlace?.name}. Pilih bagian yang berubah, jelaskan kondisi terbaru, dan sertakan foto lapangan.`}</p></div></div>
      {!signedIn && (
        <div className="auth-prompt-banner" role="status">
          <div>
            <strong>Mode Pengisian Draf Lokasi</strong>
            <p>
              Anda belum masuk akun. Anda bebas melengkapi formulir terlebih dahulu, lalu masuk atau daftar
              melalui pop-up untuk mempublikasikan {adding ? 'lokasi baru' : 'laporan perubahan'}.
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
            <Icon name="save" size={15} />
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
          {adding ? <>
            <label htmlFor="new-place-name">Nama lokasi<input id="new-place-name" value={location.name} required minLength={2} maxLength={160} onChange={e => setLocation({ ...location, name: e.target.value })} /></label>
            {similarPlaces.length > 0 && <div className="flow-notice"><p>Nama serupa sudah ada. Jika ini lokasi yang sama, buka detailnya untuk melaporkan perubahan:</p>{similarPlaces.map(p => <p key={p.id}><Link href={placeHref(String(p.id))}>{p.name} — {p.address}</Link></p>)}</div>}
            <label htmlFor="new-place-category">Kategori<input id="new-place-category" list="place-categories" value={location.category} required minLength={2} maxLength={80} onChange={e => setLocation({ ...location, category: e.target.value })} /></label>
            <datalist id="place-categories">{Array.from(new Set(places.map(p => p.category))).map(category => <option key={category} value={category} />)}</datalist>
            <label htmlFor="new-place-address">Alamat lengkap<input id="new-place-address" value={location.address} required minLength={5} maxLength={500} onChange={e => setLocation({ ...location, address: e.target.value })} /></label>
            {hasMapCoordinates && (
              <div
                style={{
                  background: 'var(--purple-100)',
                  border: '1px solid #cabaf5',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--purple-700)' }}>
                  <Icon name="map-pin-plus" size={16} />
                  <span>
                    Titik dipilih dari peta: <strong>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--purple)',
                    color: 'var(--purple)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ubah di peta
                </button>
              </div>
            )}
            <div className="coordinate-fields">
              <label htmlFor="new-place-lat">Lintang<input id="new-place-lat" type="number" step="any" min={-90} max={90} value={location.lat} required onChange={e => { setLocation({ ...location, lat: e.target.valueAsNumber }); setCoordinatesConfirmed(false); }} /></label>
              <label htmlFor="new-place-lng">Bujur<input id="new-place-lng" type="number" step="any" min={-180} max={180} value={location.lng} required onChange={e => { setLocation({ ...location, lng: e.target.valueAsNumber }); setCoordinatesConfirmed(false); }} /></label>
            </div>
            <p className="flow-help">
              {hasMapCoordinates
                ? 'Titik koordinat sudah diisi otomatis dari peta. Anda dapat menyesuaikan angka di atas jika diperlukan.'
                : 'Koordinat awal adalah pusat Surabaya. Ganti dengan koordinat tempat yang Anda kunjungi atau klik langsung titik di peta.'}
            </p>
            <label className="flow-check"><input type="checkbox" required checked={coordinatesConfirmed} onChange={e => setCoordinatesConfirmed(e.target.checked)} />Saya sudah memastikan koordinat menunjuk lokasi ini.</label>
          </> : <div className="flow-notice"><strong>{targetPlace?.name}</strong><p>{targetPlace?.address}</p><span>Lokasi laporan ini tidak dapat diganti. Kembali ke Jelajahi untuk memilih lokasi lain.</span></div>}
          <label htmlFor="reporter-name">
            Nama Anda (ditampilkan ke publik)
            <input type="text" id="reporter-name" value={reporterName} onChange={e => setReporterName(e.target.value)} maxLength={80} placeholder="Contoh: Budi Santoso" required autoComplete="name" />
          </label>
          {!adding && currentElement && <div className="flow-notice" aria-live="polite"><strong>Data saat ini: {STATUS_META[currentElement.status].label}</strong><p>{currentElement.note || 'Belum ada catatan kondisi.'}</p><small>{currentElement.isPreSurveyEvidence ? 'Sumber pra-survei, belum diverifikasi di lapangan.' : currentElement.lockedBy === 'kontributor' ? 'Berdasarkan laporan kontributor.' : 'Belum ada bukti lapangan.'}</small></div>}
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="check" size={13} />
                    <span>Foto tersimpan (klik untuk ganti)</span>
                  </span>
                </div>
              ) : (
                <>
                  <span>Pilih foto kondisi di lapangan</span>
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
            <h2>{adding ? 'Kondisi awal yang Anda temui' : 'Kondisi terbaru yang Anda temui'}</h2>
            <HumanLockSelector currentStatus={status} onSelectStatus={s => { setStatus(s); setConfirmed(false); }} />
            <label style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'flex-start', fontSize: '12px' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required style={{ marginTop: '2px' }} />
              <span>Saya sudah memeriksa foto dan memastikan kondisi ini sesuai dengan yang ada di lokasi.</span>
            </label>
          </fieldset>
          <button id="btn-submit-report" type="submit" className="primary-action" style={{ width: '100%', marginTop: '20px' }} disabled={busy || analyzing || !photo || !confirmed || (adding ? !coordinatesConfirmed : !placeId)}>{submitting ? 'Mengirim…' : adding ? 'Tambahkan Lokasi' : 'Kirim Laporan Perubahan'}</button>
          {error && <p role="alert" style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginTop: '12px', border: '1px solid #fecaca' }}>{error}</p>}
        </section>
      </form>
    </div>
  );
}
