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
import styles from '../../reviewer.module.css';

const CHECKLIST_POINTS = [
  { id: 'photoMatchesPlace', label: 'Foto sesuai dengan tempat yang dilaporkan' },
  { id: 'photoShowsElement', label: 'Foto menunjukkan elemen yang dilaporkan' },
  { id: 'descriptionMatchesEvidence', label: 'Deskripsi sesuai dengan bukti foto' },
  { id: 'notDuplicate', label: 'Tidak terlihat sebagai laporan duplikat' },
  { id: 'accessStatusMatchesEvidence', label: 'Status akses sesuai dengan bukti yang terlihat' },
] as const;

const ELEMENT_STATUS_OPTIONS: Array<{ value: AccessibilityStatus; label: string }> = [
  { value: 'UTUH', label: 'Bisa digunakan (UTUH)' },
  { value: 'TERHALANG', label: 'Terhalang (TERHALANG)' },
  { value: 'TIDAK_STANDAR', label: 'Perlu perhatian (TIDAK_STANDAR)' },
  { value: 'TIDAK_ADA', label: 'Tidak ada (TIDAK_ADA)' },
  { value: 'BELUM_DIKETAHUI', label: 'Belum diketahui' },
];

export default function ReviewReportDetailPage() {
  const params = useParams();
  const reportId = String(params.id);

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
    setNoteError('');
    setErrorMessage('');

    // Validation: NEEDS_REVISION and REJECTED require review notes
    if ((decision === 'NEEDS_REVISION' || decision === 'REJECTED') && !reviewerNote.trim()) {
      setNoteError('Catatan reviewer wajib diisi jika meminta revisi atau menolak laporan.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitReportReview(reportId, {
        decision,
        reviewer: 'reviewer.naviable',
        note: reviewerNote.trim(),
        checklist: checks,
      });

      if (result.ok) {
        setReport(result.report);
        setConfirmModal(null);
        setSuccessMessage(
          decision === 'APPROVED'
            ? 'Laporan berhasil disetujui sebagai Bukti Telah Diperiksa.'
            : decision === 'NEEDS_REVISION'
            ? 'Status laporan diubah menjadi Perlu Revisi.'
            : 'Laporan telah ditolak.'
        );
      } else {
        setErrorMessage('Review belum berhasil disimpan.');
      }
    } catch {
      setErrorMessage('Review belum berhasil disimpan.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/reviewer/reports" className={styles.secondaryButton} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Kembali ke Laporan Masuk
        </Link>
        <div className={styles.emptyState}>Memuat detail laporan pemeriksaan…</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <Link href="/reviewer/reports" className={styles.secondaryButton} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Kembali ke Laporan Masuk
        </Link>
        <div className={styles.emptyState}>Laporan tidak ditemukan.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/reviewer/reports" className={styles.secondaryButton} style={{ marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Kembali ke Laporan Masuk
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className={styles.pageTitle} style={{ fontSize: '1.4rem' }}>
              Pemeriksaan Laporan #{report.id.slice(0, 8)}
            </h1>
            <p className={styles.pageSubtitle}>
              Evaluasi bukti foto lapangan dan verifikasi elemen aksesibilitas sebelum dipublikasikan.
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
            Coba lagi
          </button>
        </div>
      )}

      <div className={styles.detailGrid}>
        {/* Kolom Kiri: Bukti Foto & Info Laporan */}
        <section className={styles.panel} aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className={styles.panelTitle}>
            <span>Bukti Foto & Data Lapangan</span>
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
                Tidak ada foto terlampir
              </div>
            )}
          </div>

          <div className={styles.metaList}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Nama Tempat</span>
              <span className={styles.metaValue} style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                {report.placeName}
              </span>
            </div>

            {report.placeAddress && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Alamat Lokasi</span>
                <span className={styles.metaValue} style={{ fontWeight: 400 }}>
                  {report.placeAddress}
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Pelapor</span>
                <span className={styles.metaValue}>{report.reporterName}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Tanggal Dilaporkan</span>
                <span className={styles.metaValue}>
                  {new Date(report.createdAt).toLocaleDateString('id-ID', {
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
              Elemen yang Dilaporkan
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
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Dilaporkan:</span>
                    <StatusBadge status={el.status} size="sm" />
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Catatan Pelapor: “{el.note || 'Tidak ada catatan tambahan.'}”
                </p>
              </div>
            ))}
          </div>

          {/* AI Photo Check Box */}
          <div className={styles.aiBox}>
            <div className={styles.aiHeader}>
              <Sparkles size={16} />
              <span>AI Photo Check (Asistensi)</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
              <p style={{ margin: '0 0 6px' }}>
                Terlihat di foto: <strong>{report.elements[0]?.element.replace('_', ' ')}</strong>
              </p>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                Tingkat Keyakinan Deteksi: <strong>Tinggi (High)</strong>
              </p>
            </div>
            <div className={styles.aiDisclaimer}>
              Catatan: Analisis AI hanya membantu memandu reviewer. Keputusan akhir tetap berada di tangan manusia (reviewer).
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Checklist 5 Butir, Penilaian 8 Elemen & Tindakan */}
        <section className={styles.panel} aria-labelledby="checklist-heading">
          <h2 id="checklist-heading" className={styles.panelTitle}>
            <span>Verifikasi & Tindakan Review</span>
            <CheckCircle size={18} color="var(--green)" aria-hidden="true" />
          </h2>

          {/* 5 Butir Review Check */}
          <div>
            <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              1. Butir Pemeriksaan Bukti (Review Check)
            </h3>
            <div className={styles.checkList}>
              {CHECKLIST_POINTS.map(pt => (
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
              2. Checklist Standar 8 Elemen Akses
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              Sesuaikan status elemen akses yang terlihat jelas pada foto bukti:
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
                          DILAPORKAN
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
                      {ELEMENT_STATUS_OPTIONS.map(opt => (
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
              3. Catatan Reviewer
            </label>
            <textarea
              id="reviewer-notes"
              className={styles.textarea}
              placeholder="Tulis alasan jika laporan perlu diperbaiki atau ditolak. (Opsional untuk persetujuan)."
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
              <span>Setujui (Approve)</span>
            </button>

            <button
              type="button"
              className={styles.btnRevision}
              disabled={submitting}
              onClick={() => handleDecision('NEEDS_REVISION')}
            >
              <RotateCcw size={16} />
              <span>Minta Revisi</span>
            </button>

            <button
              type="button"
              className={styles.btnReject}
              disabled={submitting}
              onClick={() => setConfirmModal('REJECTED')}
            >
              <XCircle size={16} />
              <span>Tolak (Reject)</span>
            </button>
          </div>
        </section>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>
              {confirmModal === 'APPROVED' ? 'Setujui Laporan Ini?' : 'Tolak Laporan Ini?'}
            </h3>
            <p className={styles.modalText}>
              {confirmModal === 'APPROVED'
                ? 'Laporan akan dipublikasikan ke peta sebagai "Bukti telah diperiksa". Pastikan foto dan elemen sudah sesuai dengan hasil verifikasi Anda.'
                : 'Laporan akan ditolak dan tidak dipublikasikan ke data publik. Pastikan Anda telah menuliskan alasan penolakan pada catatan reviewer.'}
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setConfirmModal(null)}
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="button"
                className={confirmModal === 'APPROVED' ? styles.btnApprove : styles.btnReject}
                onClick={() => handleDecision(confirmModal)}
                disabled={submitting}
              >
                {submitting ? 'Menyimpan…' : confirmModal === 'APPROVED' ? 'Ya, Setujui' : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
