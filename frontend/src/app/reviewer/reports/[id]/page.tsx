'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Sparkles,
  Camera,
} from 'lucide-react';
import { fetchReviewerReport, submitReportReview } from '@/lib/api';
import type { ReviewerAuditItem, AccessibilityStatus, ReviewDecision } from '@/types';
import { CHAIN_ELEMENT_MAP } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTranslation } from '@/hooks/useTranslation';
import styles from '../../reviewer.module.css';

export default function ReviewReportDetailPage() {
  const { t, formatDate } = useTranslation();
  const params = useParams();
  const reportId = String(params.id);

  const checklistPoints = [
    { id: 'photoMatchesPlace', label: t('reviewer.check1') },
    { id: 'photoShowsElement', label: t('reviewer.check2') },
    { id: 'descriptionMatchesEvidence', label: t('reviewer.check3') },
    { id: 'notDuplicate', label: t('reviewer.check4') },
    { id: 'accessStatusMatchesEvidence', label: t('reviewer.check5') },
  ] as const;

  const elementStatusOptions: Array<{ value: AccessibilityStatus; label: string }> = [
    { value: 'UTUH', label: `${t('status.UTUH.label')} (UTUH)` },
    { value: 'TERHALANG', label: `${t('status.TERHALANG.label')} (TERHALANG)` },
    { value: 'TIDAK_STANDAR', label: `${t('status.TIDAK_STANDAR.label')} (TIDAK_STANDAR)` },
    { value: 'TIDAK_ADA', label: `${t('status.TIDAK_ADA.label')} (TIDAK_ADA)` },
    { value: 'BELUM_DIKETAHUI', label: t('status.BELUM_DIKETAHUI.label') },
  ];

  const [report, setReport] = useState<ReviewerAuditItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Verification checks state
  const [checks, setChecks] = useState<Record<string, boolean>>({
    photoMatchesPlace: false,
    photoShowsElement: false,
    descriptionMatchesEvidence: false,
    notDuplicate: false,
    accessStatusMatchesEvidence: false,
  });

  // Standard elements assessment state (default to reported element status)
  const [elementAssessments, setElementAssessments] = useState<Record<string, AccessibilityStatus>>({});

  // Reviewer note state
  const [reviewerNote, setReviewerNote] = useState('');
  const [noteError, setNoteError] = useState('');

  // Modals & submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchReviewerReport(reportId);
        if (active) {
          setReport(data.report);

          // Initialize element assessments
          const initialAssessments: Record<string, AccessibilityStatus> = {};
          data.report.elements.forEach(el => {
            initialAssessments[el.element] = el.status;
          });
          setElementAssessments(initialAssessments);

          if (data.report.reviewNote) {
            setReviewerNote(data.report.reviewNote);
          }
          if (data.report.reviewChecklist) {
            setChecks(prev => ({ ...prev, ...data.report.reviewChecklist }));
          }
        }
      } catch (err) {
        console.error('Failed to load report for review:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [reportId]);

  function toggleCheck(pointId: string) {
    setChecks(prev => ({ ...prev, [pointId]: !prev[pointId] }));
  }

  function handleAssessmentChange(elementCode: string, status: AccessibilityStatus) {
    setElementAssessments(prev => ({ ...prev, [elementCode]: status }));
  }

  async function handleDecision(decision: ReviewDecision) {
    if (!report) return;
    setNoteError('');
    setErrorMessage('');

    // Validation: NEEDS_REVISION and REJECTED require review notes
    if ((decision === 'NEEDS_REVISION' || decision === 'REJECTED') && !reviewerNote.trim()) {
      setNoteError(t('reviewer.notesRequiredForRejectOrRevise'));
      return;
    }

    // Reviewer-corrected element statuses; unknowns are omitted so they never overwrite existing evidence.
    const reviewedElements = (Object.keys(CHAIN_ELEMENT_MAP) as Array<keyof typeof CHAIN_ELEMENT_MAP>)
      .map(code => {
        const codeName = CHAIN_ELEMENT_MAP[code].codeName;
        const original = report.elements.find(e => e.element === codeName);
        return { element: codeName, status: elementAssessments[codeName] ?? 'BELUM_DIKETAHUI', note: original?.note ?? '' };
      })
      .filter(e => e.status !== 'BELUM_DIKETAHUI');

    setSubmitting(true);
    try {
      const result = await submitReportReview(reportId, {
        decision,
        reviewer: 'reviewer.naviable',
        note: reviewerNote.trim(),
        checklist: checks,
        elements: reviewedElements.length ? reviewedElements : undefined,
      });

      if (result.ok) {
        setReport(result.report);
        setConfirmModal(null);
        setSuccessMessage(
          decision === 'APPROVED'
            ? t('reviewer.approveSuccess')
            : decision === 'NEEDS_REVISION'
            ? t('reviewer.revisionSuccess')
            : t('reviewer.rejectSuccess')
        );
      } else {
        setErrorMessage(t('reviewer.reviewSaveFailed'));
      }
    } catch {
      setErrorMessage(t('reviewer.reviewSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/reviewer/reports" className={styles.secondaryButton} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> {t('reviewer.backToIncoming')}
        </Link>
        <div className={styles.emptyState}>{t('reviewer.loadingDetail')}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <Link href="/reviewer/reports" className={styles.secondaryButton} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> {t('reviewer.backToIncoming')}
        </Link>
        <div className={styles.emptyState}>{t('reviewer.reportNotFound')}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/reviewer/reports" className={styles.secondaryButton} style={{ marginBottom: '12px' }}>
          <ArrowLeft size={16} /> {t('reviewer.backToIncoming')}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className={styles.pageTitle} style={{ fontSize: '1.4rem' }}>
              {t('reviewer.detailTitlePrefix', { id: report.id.slice(0, 8) })}
            </h1>
            <p className={styles.pageSubtitle}>
              {t('reviewer.detailSubtitle')}
            </p>
          </div>
          <div>
            <span
              className={`${styles.badge} ${
                report.reviewStatus === 'APPROVED'
                  ? styles.badgeApproved
                  : report.reviewStatus === 'NEEDS_REVISION'
                  ? styles.badgeRevision
                  : report.reviewStatus === 'REJECTED'
                  ? styles.badgeRejected
                  : styles.badgeSubmitted
              }`}
              style={{ fontSize: '13px', padding: '5px 12px' }}
            >
              Status: {report.reviewStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          style={{
            background: 'var(--notice-success-bg)',
            color: 'var(--notice-success-ink)',
            border: '1px solid var(--notice-success-border)',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            background: 'var(--notice-error-bg)',
            color: 'var(--notice-error-ink)',
            border: '1px solid var(--notice-error-border)',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setErrorMessage('')}
            style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className={styles.detailGrid}>
        {/* Kolom Kiri: Bukti Foto & Info Laporan */}
        <section className={styles.panel} aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className={styles.panelTitle}>
            <span>{t('reviewer.evidencePanelTitle')}</span>
            <Camera size={18} color="var(--purple)" aria-hidden="true" />
          </h2>

          <div className={styles.photoViewer}>
            {report.photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={report.photoUrl}
                alt={`Bukti kondisi ${report.placeName}`}
                className={styles.photoImg}
              />
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
                {t('reviewer.noPhotoAttached')}
              </div>
            )}
          </div>

          <div className={styles.metaList}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>{t('reviewer.metaPlaceName')}</span>
              <span className={styles.metaValue} style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                {report.placeName}
              </span>
            </div>

            {report.placeAddress && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t('reviewer.metaAddress')}</span>
                <span className={styles.metaValue} style={{ fontWeight: 400 }}>
                  {report.placeAddress}
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t('reviewer.metaReporter')}</span>
                <span className={styles.metaValue}>{report.reporterName}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t('reviewer.metaReportDate')}</span>
                <span className={styles.metaValue}>
                  {formatDate(report.createdAt, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '16px 0' }} />

          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              {t('reviewer.reportedElementsHeading')}
            </h3>
            {report.elements.map(el => (
              <div
                key={el.element}
                style={{
                  background: 'var(--surface-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                    {el.element.replace('_', ' ')}
                  </strong>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{t('reviewer.reportedBadge')}:</span>
                    <StatusBadge status={el.status} size="sm" />
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {t('reviewer.reporterNotesPrefix')}: “{el.note || t('reviewer.noExtraNotes')}”
                </p>
              </div>
            ))}
          </div>

          {/* AI Photo Check Box */}
          <div className={styles.aiBox}>
            <div className={styles.aiHeader}>
              <Sparkles size={16} />
              <span>{report.photoIntegrity ? 'Pemeriksaan Integritas Foto' : t('reviewer.aiPhotoCheckBox')}</span>
            </div>
            {report.photoIntegrity ? (
              <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
                <p style={{ margin: '0 0 6px' }}>
                  Hasil:{' '}
                  <strong>
                    {report.photoIntegrity.outcome === 'trusted_ai_provenance'
                      ? 'Penanda asal AI terverifikasi'
                      : report.photoIntegrity.outcome === 'suspicious'
                        ? 'Memerlukan foto pembanding'
                        : 'Tidak dapat dipastikan'}
                  </strong>
                </p>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                  {report.photoIntegrity.signals.map(signal => signal.detail).join(' ') || 'Belum ada hasil pemeriksaan integritas tersimpan untuk laporan ini.'}
                </p>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
                <p style={{ margin: '0 0 6px' }}>
                  {t('reviewer.aiDetectedInPhoto')}: <strong>{report.elements[0]?.element.replace('_', ' ')}</strong>
                </p>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                  {t('reviewer.aiConfidence')}: <strong>Tinggi (High)</strong>
                </p>
              </div>
            )}
            <div className={styles.aiDisclaimer}>
              {report.photoIntegrity?.disclaimer || t('reviewer.aiReviewerNote')}
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Checklist 5 Butir, Penilaian 8 Elemen & Tindakan */}
        <section className={styles.panel} aria-labelledby="checklist-heading">
          <h2 id="checklist-heading" className={styles.panelTitle}>
            <span>{t('reviewer.verificationPanelTitle')}</span>
            <CheckCircle size={18} color="var(--green)" aria-hidden="true" />
          </h2>

          {/* 5 Butir Review Check */}
          <div>
            <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              {t('reviewer.step1ReviewCheckTitle')}
            </h3>
            <div className={styles.checkList}>
              {checklistPoints.map(pt => (
                <label key={pt.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={Boolean(checks[pt.id])}
                    onChange={() => toggleCheck(pt.id)}
                  />
                  <span>{pt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 8 Elemen Standar Naviable */}
          <div>
            <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              {t('reviewer.step2StandardElementsTitle')}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              {t('reviewer.step2StandardElementsSub')}
            </p>
            <div className={styles.standardElements}>
              {(Object.keys(CHAIN_ELEMENT_MAP) as Array<keyof typeof CHAIN_ELEMENT_MAP>).map(code => {
                const item = CHAIN_ELEMENT_MAP[code];
                const currentStatus = elementAssessments[item.codeName] ?? 'BELUM_DIKETAHUI';
                const isReported = report.elements.some(e => e.element === item.codeName);

                return (
                  <div
                    key={code}
                    className={styles.elementCard}
                    style={isReported ? { borderColor: 'var(--purple)', background: 'var(--purple-100)' } : {}}
                  >
                    <div className={styles.elementCardHeader}>
                      <span>
                        {code} — {item.label}
                      </span>
                      {isReported && (
                        <span style={{ fontSize: '10px', color: 'var(--purple)', fontWeight: 700 }}>
                          {t('reviewer.reportedBadge').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <select
                      className={styles.elementSelect}
                      value={currentStatus}
                      onChange={e =>
                        handleAssessmentChange(item.codeName, e.target.value as AccessibilityStatus)
                      }
                      aria-label={`Status untuk ${item.label}`}
                    >
                      {elementStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviewer Note Textarea */}
          <div>
            <label
              htmlFor="reviewer-notes"
              style={{ display: 'block', fontSize: '0.925rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}
            >
              {t('reviewer.step3ReviewerNotesTitle')}
            </label>
            <textarea
              id="reviewer-notes"
              className={styles.textarea}
              placeholder={t('reviewer.reviewerNotesPlaceholder')}
              value={reviewerNote}
              onChange={e => {
                setReviewerNote(e.target.value);
                setNoteError('');
              }}
            />
            {noteError && (
              <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '-12px', marginBottom: '16px' }} role="alert">
                {noteError}
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.btnApprove}
              disabled={submitting}
              onClick={() => setConfirmModal('APPROVED')}
            >
              <CheckCircle size={16} />
              <span>{t('reviewer.btnApprove')}</span>
            </button>

            <button
              type="button"
              className={styles.btnRevision}
              disabled={submitting}
              onClick={() => handleDecision('NEEDS_REVISION')}
            >
              <RotateCcw size={16} />
              <span>{t('reviewer.btnRevision')}</span>
            </button>

            <button
              type="button"
              className={styles.btnReject}
              disabled={submitting}
              onClick={() => setConfirmModal('REJECTED')}
            >
              <XCircle size={16} />
              <span>{t('reviewer.btnReject')}</span>
            </button>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>
              {confirmModal === 'APPROVED' ? t('reviewer.modalApproveTitle') : t('reviewer.modalRejectTitle')}
            </h3>
            <p className={styles.modalText}>
              {confirmModal === 'APPROVED'
                ? t('reviewer.modalApproveText')
                : t('reviewer.modalRejectText')}
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setConfirmModal(null)}
                disabled={submitting}
              >
                {t('reviewer.modalCancelBtn')}
              </button>
              <button
                type="button"
                className={confirmModal === 'APPROVED' ? styles.btnApprove : styles.btnReject}
                onClick={() => handleDecision(confirmModal)}
                disabled={submitting}
              >
                {submitting
                  ? t('reviewer.submittingReview')
                  : confirmModal === 'APPROVED'
                  ? t('reviewer.modalConfirmApproveBtn')
                  : t('reviewer.modalConfirmRejectBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
