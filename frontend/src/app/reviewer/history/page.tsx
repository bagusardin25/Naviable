'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, CheckCircle2, RotateCcw, XCircle, RefreshCw } from 'lucide-react';
import { fetchReviewerHistory } from '@/lib/api';
import type { ReviewerAuditItem } from '@/types';
import { REVIEW_STATUS_META } from '@/types';
import styles from '../reviewer.module.css';

export default function ReviewerHistoryPage() {
  const [history, setHistory] = useState<ReviewerAuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function handleRefresh() {
    setLoading(true);
    try {
      const data = await fetchReviewerHistory({ limit: 100 });
      setHistory(data.history);
    } catch (err) {
      console.error('Error loading reviewer history:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchReviewerHistory({ limit: 100 })
      .then(data => {
        if (active) {
          setHistory(data.history);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error loading reviewer history:', err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function getBadgeClass(status: string) {
    switch (status) {
      case 'APPROVED':
      case 'PUBLISHED':
        return styles.badgeApproved;
      case 'NEEDS_REVISION':
        return styles.badgeRevision;
      case 'REJECTED':
        return styles.badgeRejected;
      default:
        return styles.badgeSubmitted;
    }
  }

  function getDecisionIcon(status: string) {
    switch (status) {
      case 'APPROVED':
      case 'PUBLISHED':
        return <CheckCircle2 size={15} color="var(--green)" aria-hidden="true" />;
      case 'NEEDS_REVISION':
        return <RotateCcw size={15} color="#a16207" aria-hidden="true" />;
      case 'REJECTED':
        return <XCircle size={15} color="var(--red)" aria-hidden="true" />;
      default:
        return null;
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className={styles.pageTitle}>Riwayat Review</h1>
            <p className={styles.pageSubtitle}>
              Catatan audit keputusan verifikasi laporan yang telah diproses oleh tim reviewer Naviable.
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Segarkan riwayat review"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Memuat riwayat review…</div>
        ) : history.length === 0 ? (
          <div className={styles.emptyState}>Belum ada laporan yang telah selesai direview.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Tempat & Lokasi</th>
                <th scope="col">Reviewer</th>
                <th scope="col">Keputusan</th>
                <th scope="col">Tanggal Review</th>
                <th scope="col">Catatan Review</th>
                <th scope="col" style={{ textAlign: 'right' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => {
                const meta = REVIEW_STATUS_META[item.reviewStatus] ?? REVIEW_STATUS_META.APPROVED;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.placeCell}>
                        <span className={styles.placeName}>{item.placeName}</span>
                        {item.placeAddress && (
                          <span className={styles.placeAddress}>{item.placeAddress}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {item.reviewedBy || 'reviewer.naviable'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(item.reviewStatus)}`}>
                        {getDecisionIcon(item.reviewStatus)}
                        <span>{meta.label}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                      {item.reviewedAt
                        ? new Date(item.reviewedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : new Date(item.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: item.reviewNote ? 'var(--ink)' : 'var(--muted)',
                          fontStyle: item.reviewNote ? 'normal' : 'italic',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.reviewNote || 'Tidak ada catatan'}
                      >
                        {item.reviewNote || 'Tanpa catatan khusus'}
                      </p>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/reviewer/reports/${item.id}`} className={styles.secondaryButton}>
                        <Eye size={14} aria-hidden="true" />
                        <span>Lihat</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
