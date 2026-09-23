'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, CheckCircle2, RotateCcw, XCircle, RefreshCw } from 'lucide-react';
import { fetchReviewerHistory } from '@/lib/api';
import type { ReviewerAuditItem } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewerLoadError } from '@/components/reviewer/ReviewerLoadError';
import styles from '../reviewer.module.css';

export default function ReviewerHistoryPage() {
  const { t, formatDate } = useTranslation();
  const [history, setHistory] = useState<ReviewerAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  function handleRefresh() {
    setLoading(true);
    setAttempt(n => n + 1);
  }

  useEffect(() => {
    let active = true;
    fetchReviewerHistory({ limit: 100 })
      .then(data => {
        if (active) {
          setHistory(data.history);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error loading reviewer history:', err);
        if (active) {
          setHistory([]);
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

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

  function getStatusLabel(status: string) {
    switch (status) {
      case 'APPROVED':
      case 'PUBLISHED':
        return t('reviewer.filterApproved');
      case 'NEEDS_REVISION':
        return t('reviewer.filterRevision');
      case 'REJECTED':
        return t('reviewer.filterRejected');
      default:
        return t('reviewer.filterAwaiting');
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
            <h1 className={styles.pageTitle}>{t('reviewer.historyPageTitle')}</h1>
            <p className={styles.pageSubtitle}>
              {t('reviewer.historyPageSub')}
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
            <span>{t('reviewer.refreshBtn')}</span>
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>{t('reviewer.loadingHistory')}</div>
        ) : error ? (
          <ReviewerLoadError error={error} onRetry={handleRefresh} />
        ) : history.length === 0 ? (
          <div className={styles.emptyState}>{t('reviewer.noHistoryYet')}</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('reviewer.tablePlace')}</th>
                <th scope="col">{t('reviewer.historyReviewerCol')}</th>
                <th scope="col">{t('reviewer.historyDecisionCol')}</th>
                <th scope="col">{t('reviewer.historyDateCol')}</th>
                <th scope="col">{t('reviewer.historyNoteCol')}</th>
                <th scope="col" style={{ textAlign: 'right' }}>{t('reviewer.historyDetailCol')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => {
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
                        <span>{getStatusLabel(item.reviewStatus)}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                      {item.reviewedAt
                        ? formatDate(item.reviewedAt, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : formatDate(item.createdAt, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
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
                        title={item.reviewNote || t('reviewer.noSpecialNotes')}
                      >
                        {item.reviewNote || t('reviewer.noSpecialNotes')}
                      </p>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/reviewer/reports/${item.id}`} className={styles.secondaryButton}>
                        <Eye size={14} aria-hidden="true" />
                        <span>{t('common.view')}</span>
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
