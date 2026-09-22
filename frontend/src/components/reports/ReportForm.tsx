'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Place, ChainElementCode, AccessibilityStatus, CHAIN_ELEMENT_MAP, STATUS_META } from '@/types';
import { analyzePhoto, submitReport, submitNewPlace, type ApiAnalysis, type PhotoCheck, type ReportPayload, type NewLocation } from '@/lib/api';
import { placeHref } from '@/lib/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { AIDraftPanel } from './AIDraftPanel';
import { HumanLockSelector } from './HumanLockSelector';
import { saveDraftPhoto, getDraftPhoto, deleteDraftPhoto } from '@/lib/draftStorage';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
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
    draft?.elementCode && CHAIN_ELEMENT_MAP[draft.elementCode] ? draft.elementCode : 'E1'
  );
  const [status, setStatus] = useState<AccessibilityStatus>(draft?.status && STATUS_META[draft.status] ? draft.status : 'BELUM_DIKETAHUI');
  const [note, setNote] = useState<string>(draft?.note ?? '');
  const [draftRestored, setDraftRestored] = useState<boolean>(
    Boolean(draft && (draft.reporterName || draft.note || draft.placeId))
  );
  const [photo, setPhoto] = useState<{ image: string; mimeType: string } | null>(null);
  const [photoRestored, setPhotoRestored] = useState<boolean>(false);

  // Restore draft photo from IndexedDB if available
  useEffect(() => {
    let active = true;
    getDraftPhoto(draftKey)
      .then((saved) => {
        if (active && saved) {
          setPhoto({ image: saved.image, mimeType: saved.mimeType });
          setPhotoRestored(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [draftKey]);

  const [analysis, setAnalysis] = useState<ApiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reading, setReading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccessPlace, setSubmittedSuccessPlace] = useState<Place | null>(null);
  // Server-side verdict on whether the photo showed the chosen element; drives the
  // confirmation screen so a mismatch is explained here, not only in the profile.
  const [submittedPhotoCheck, setSubmittedPhotoCheck] = useState<PhotoCheck>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const busy = submitting || reading;
  const integrityBlocked = analysis?.photoIntegrity?.recommendedAction === 'request_new_capture';
  const missingItems = [
    !photo ? t('reports.missingPhoto') : null,
    adding && !coordinatesConfirmed ? t('reports.missingCoords') : null,
    !confirmed ? t('reports.missingConfirm') : null,
  ].filter((item): item is string => Boolean(item));
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
    deleteDraftPhoto(draftKey).catch(() => {});
    setReporterName('');
    setNote('');
    setStatus('BELUM_DIKETAHUI');
    setPhoto(null);
    setPhotoRestored(false);
    setDraftRestored(false);
    setConfirmed(false);
  }

  function readPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setAnalysis(null); setAiError(''); setConfirmed(false); setError(''); setPhoto(null); setPhotoRestored(false);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(t('reports.photoSizeError')); return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const photoData = { image: String(reader.result), mimeType: file.type };
      setPhoto(photoData);
      setReading(false);
      saveDraftPhoto(draftKey, photoData).catch(() => {});
      // Pemeriksaan foto (integritas + aksesibilitas) berjalan otomatis setiap unggahan.
      // Endpoint AI memerlukan sesi masuk; untuk draf anonim, pemeriksaan ditunda sampai masuk
      // dan server tetap memeriksa provenance foto saat laporan dikirim.
      if (signedIn) void analyze(photoData);
    };
    reader.onerror = () => { setError(t('reports.photoReadError')); setReading(false); };
    reader.readAsDataURL(file);
  }

  async function analyze(target?: { image: string; mimeType: string }) {
    const src = target ?? photo;
    if (!src || analyzing) return;
    setAnalyzing(true); setAiError(''); setConfirmed(false);
    try { setAnalysis(await analyzePhoto(src.image, src.mimeType)); }
    catch (e) { setAnalysis(null); setAiError(e instanceof Error ? e.message : t('reports.aiUnavailableError')); }
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
    if (!photo || !confirmed) { setError(t('reports.photoAndConfirmationRequired')); return; }
    if (integrityBlocked) { setError(t('reports.integrityBlockedHint')); return; }
    if (adding && !coordinatesConfirmed) { setError(t('reports.coordsConfirmationRequired')); return; }
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
      deleteDraftPhoto(draftKey).catch(() => {});
      setSubmittedPhotoCheck(result.photoCheck ?? null);
      setSubmittedSuccessPlace(result.place);
    }
    catch (e) { setError(e instanceof Error ? e.message : t('reports.submissionFailedError')); }
    finally { setSubmitting(false); }
  }

  if (submittedSuccessPlace) {
    // The AI gate found the photo does not show the element that was picked, so the report
    // went back to the contributor instead of into the reviewer queue. Say so plainly here.
    const mismatched = submittedPhotoCheck !== null && !submittedPhotoCheck.matches;
    return (
      <div className="page-scroll">
        <div className="card form-card" style={{ maxWidth: '560px', margin: '40px auto', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: mismatched ? 'var(--notice-error-bg)' : 'var(--notice-warning-bg)', border: `1px solid ${mismatched ? 'var(--notice-error-border)' : 'var(--notice-warning-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: mismatched ? 'var(--notice-error-ink)' : 'var(--orange)' }}>
            <Icon name={mismatched ? 'warning' : 'check'} size={28} />
          </div>
          <span className="eyebrow" style={{ color: mismatched ? 'var(--notice-error-ink)' : 'var(--orange)', fontWeight: 700 }}>
            {mismatched ? t('reports.photoMismatchEyebrow') : t('reports.successEyebrow')}
          </span>
          <h1 style={{ fontSize: '1.4rem', margin: '6px 0 12px', color: 'var(--ink)' }}>
            {mismatched ? t('reports.photoMismatchTitle') : t('reports.successTitle')}
          </h1>
          <p style={{ color: 'var(--ink)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '16px' }}>
            {mismatched ? submittedPhotoCheck.detail : t('reports.successBody', { name: submittedSuccessPlace.name })}
          </p>
          <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'left' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--ink)' }}>
              {mismatched ? t('reports.photoMismatchNextTitle') : t('reports.successCurateTitle')}
            </p>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {mismatched ? t('reports.photoMismatchNextDesc') : t('reports.successCurateDesc')}
            </p>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => onSubmitReport(submittedSuccessPlace)}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {t('reports.successDoneBtn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">

      {/* Add-place navigation is handled by the sidebar, so no back button here; corrections keep it. */}
      {!adding && <button type="button" className="secondary-action" onClick={onCancel}>← {t('reports.backToDetail')}</button>}
      <div className="page-title"><div><span className="eyebrow">{t('reports.citizenContribution')}</span><h1>{adding ? t('reports.addNewPlaceTitle') : t('reports.reportChangeTitle')}</h1><p>{adding ? t('reports.addNewPlaceDesc') : t('reports.reportChangeDesc', { name: targetPlace?.name ?? '' })}</p></div></div>
      {!signedIn && (
        <div className="auth-prompt-banner" role="status">
          <div>
            <strong>{t('reports.draftModeNoticeTitle')}</strong>
            <p>
              {t('reports.draftModeNoticeDesc')}
            </p>
          </div>
          {onRequireAuth && (
            <button
              type="button"
              className="auth-prompt-btn"
              onClick={onRequireAuth}
            >
              {t('reports.authPromptBtn')}
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
            <span>
              {photo
                ? t('reports.draftRestoredText')
                : t('reports.draftRestoredTextNoPhoto')}
            </span>
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
            {t('reports.clearDraftBtn')}
          </button>
        </div>
      )}
      <form onSubmit={publish} className="report-grid" aria-busy={busy}>
        <fieldset disabled={busy || analyzing} className="card form-card" style={{ minWidth: 0 }}>
          <h2>{t('reports.step1Title')}</h2>
          {adding ? <>
            <label htmlFor="new-place-name">{t('reports.placeNameLabel')}<input type="text" id="new-place-name" placeholder={t('reports.placeNamePlaceholder')} value={location.name} required minLength={2} maxLength={160} onChange={e => setLocation({ ...location, name: e.target.value })} /></label>
            {similarPlaces.length > 0 && <div className="flow-notice"><p>{t('reports.similarPlacesFound')}</p>{similarPlaces.map(p => <p key={p.id}><Link href={placeHref(String(p.id))}>{p.name} — {p.address}</Link></p>)}</div>}
            <label htmlFor="new-place-category">{t('reports.categoryLabel')}<input type="text" id="new-place-category" placeholder={t('reports.categoryPlaceholder')} list="place-categories" value={location.category} required minLength={2} maxLength={80} onChange={e => setLocation({ ...location, category: e.target.value })} /></label>
            <datalist id="place-categories">{Array.from(new Set(places.map(p => p.category))).map(category => <option key={category} value={category} />)}</datalist>
            <label htmlFor="new-place-address">{t('reports.fullAddressLabel')}<input type="text" id="new-place-address" placeholder={t('reports.fullAddressPlaceholder')} value={location.address} required minLength={5} maxLength={500} onChange={e => setLocation({ ...location, address: e.target.value })} /></label>
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
                    {t('reports.pointSelectedFromMap', { lat: location.lat.toFixed(5), lng: location.lng.toFixed(5) })}
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
                  {t('reports.changeOnMap')}
                </button>
              </div>
            )}
            <div className="coordinate-fields">
              <label htmlFor="new-place-lat">{t('reports.latitudeLabel')}<input id="new-place-lat" type="number" step="any" min={-90} max={90} value={location.lat} required onChange={e => { setLocation({ ...location, lat: e.target.valueAsNumber }); setCoordinatesConfirmed(false); }} /></label>
              <label htmlFor="new-place-lng">{t('reports.longitudeLabel')}<input id="new-place-lng" type="number" step="any" min={-180} max={180} value={location.lng} required onChange={e => { setLocation({ ...location, lng: e.target.valueAsNumber }); setCoordinatesConfirmed(false); }} /></label>
            </div>
            <p className="flow-help">
              {hasMapCoordinates
                ? t('reports.coordAutoHelp')
                : t('reports.coordCenterHelp')}
            </p>
            <label className="flow-check"><input type="checkbox" required checked={coordinatesConfirmed} onChange={e => setCoordinatesConfirmed(e.target.checked)} />{t('reports.coordConfirmedCheck')}</label>
          </> : <div className="flow-notice"><strong>{targetPlace?.name}</strong><p>{targetPlace?.address}</p><span>{t('reports.fixedLocationNotice')}</span></div>}
          <label htmlFor="reporter-name">
            {t('reports.reporterNameLabel')}
            <input type="text" id="reporter-name" value={reporterName} onChange={e => setReporterName(e.target.value)} maxLength={80} placeholder={t('reports.reporterNamePlaceholder')} required autoComplete="name" />
          </label>
          {!adding && currentElement && (
            <div className="flow-notice" aria-live="polite">
              <strong>{t('reports.currentDataLabel', { status: t(`status.${currentElement.status}.label`) || STATUS_META[currentElement.status].label })}</strong>
              <p>{currentElement.note || t('reports.noCurrentNotes')}</p>
              <small>{currentElement.isPreSurveyEvidence ? t('reports.presurveySourceUnverified') : currentElement.lockedBy === 'kontributor' ? t('reports.basedOnContributor') : t('reports.noFieldEvidence')}</small>
            </div>
          )}
          <label htmlFor="report-element-select">
            {t('reports.reportedElementLabel')}
            <select id="report-element-select" value={elementCode} onChange={e => { setElementCode(e.target.value as ChainElementCode); setStatus('BELUM_DIKETAHUI'); setConfirmed(false); }} required>
              {(Object.keys(CHAIN_ELEMENT_MAP) as ChainElementCode[]).map(code => (
                <option key={code} value={code}>
                  {code} — {t(`elements.${code}.name`) || CHAIN_ELEMENT_MAP[code].label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="field-label-text">{t('reports.photoFieldLabel')}</span>
            <label htmlFor="file-upload-input" className="upload-box" aria-label={t('reports.photoFieldLabel')}>
              <Icon name="camera" size={26} />
              {photo ? (
                <div className="upload-preview-badge">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="check" size={13} />
                    <span>{photoRestored ? t('reports.photoRestoredText') : t('reports.photoStoredText')}</span>
                  </span>
                </div>
              ) : (
                <>
                  <span>{t('reports.photoUploadBoxText')}</span>
                  <small>{t('reports.photoFormatHelp')}</small>
                </>
              )}
              <input type="file" id="file-upload-input" accept="image/jpeg,image/png,image/webp" onChange={readPhoto} required={!photo} />
            </label>
          </div>
          <label htmlFor="report-notes">
            {t('reports.additionalNotesLabel')}
            <textarea id="report-notes" value={note} maxLength={1000} onChange={e => { setNote(e.target.value); setConfirmed(false); }} placeholder={t('reports.additionalNotesPlaceholder')} rows={4} />
          </label>
        </fieldset>
        <section className="card ai-card" aria-label={t('reports.inspectionAndConfirmationAria')}>
          <AIDraftPanel analysis={analysis} analyzing={analyzing} error={aiError} elementCode={CHAIN_ELEMENT_MAP[elementCode].codeName} />
          <button type="button" className="secondary-action" onClick={() => analyze()} disabled={!photo || analyzing || busy || !signedIn}><Icon name="photo" />{analyzing ? t('reports.aiAnalyzingBtnText') : t('reports.aiAnalyzeBtnText')}</button>
          {!signedIn && photo && (
            <p role="status" style={{ color: 'var(--muted)', fontSize: '12px', margin: '4px 0 0', lineHeight: 1.5 }}>{t('reports.autoCheckAfterSignIn')}</p>
          )}
          <fieldset disabled={busy || analyzing} style={{ border: 0, padding: 0, minWidth: 0 }}>
            <h2>{adding ? t('reports.initialConditionHeading') : t('reports.updatedConditionHeading')}</h2>
            <HumanLockSelector currentStatus={status} onSelectStatus={s => { setStatus(s); setConfirmed(false); }} />
            {status === 'BELUM_DIKETAHUI' && (
              <p role="status" style={{ color: 'var(--muted)', fontSize: '12px', margin: '8px 0 0', lineHeight: 1.5 }}>{t('reports.belumDiketahuiHint')}</p>
            )}
            <label style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'flex-start', fontSize: '12px' }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required disabled={integrityBlocked} style={{ marginTop: '2px' }} />
              <span>{t('reports.humanConfirmationCheck')}</span>
            </label>
          </fieldset>
          {!submitting && (integrityBlocked ? (
            <p role="status" style={{ color: 'var(--ink)', background: 'var(--notice-warning-bg)', border: '1px solid var(--notice-warning-border)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginTop: '16px', lineHeight: 1.5 }}>{t('reports.integrityBlockedHint')}</p>
          ) : missingItems.length ? (
            <p role="status" style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '16px', lineHeight: 1.5 }}>{t('reports.completeFirst')} {missingItems.join(', ')}.</p>
          ) : null)}
          <button id="btn-submit-report" type="submit" className="primary-action" style={{ width: '100%', marginTop: '12px' }} disabled={busy || analyzing || !photo || !confirmed || integrityBlocked || (adding ? !coordinatesConfirmed : !placeId)}>{submitting ? t('reports.submittingReport') : adding ? t('reports.submitAddPlace') : t('reports.submitCorrection')}</button>
          {error && <p role="alert" style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginTop: '12px', border: '1px solid #fecaca' }}>{error}</p>}
        </section>
      </form>
    </div>
  );
}
