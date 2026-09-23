'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, RotateCcw, XCircle, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { fetchReviewerStats, fetchReviewerReports } from '@/lib/api';
import type { ReviewerStats, ReviewerAuditItem } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewerLoadError } from '@/components/reviewer/ReviewerLoadError';
import styles from './reviewer.module.css';

export default function ReviewerDashboardPage() {
  const { t, formatDate } = useTranslation();
  const [stats, setStats] = useState<ReviewerStats | null>(null);
  const [pendingReports, setPendingReports] = useState<ReviewerAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed load must never read as "0 waiting" / an empty queue.
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  function handleRefresh() {
    setLoading(true);
    setAttempt(n => n + 1);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchReviewerStats(),
      fetchReviewerReports({ status: 'SUBMITTED', limit: 5 }),
    ]).then(([statsData, reportsData]) => {
      if (active) {
        setStats(statsData);
        setPendingReports(reportsData.reports);
        setError(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error loading reviewer dashboard:', err);
      if (active) {
        setStats(null);
        setError(err);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const statValue = (value: number | undefined) => (loading ? '…' : error ? '–' : value ?? 0);

  function getStatusLabel(status: string) {
    switch (status) {
      case 'APPROVED':
      case 'PUBLISHED':
        return t('reviewer.filterApproved');
      case 'NEEDS_REVISION':
        return t('reviewer.filterRevision');
      case 'REJECTED':
        return t('reviewer.filterRejected');
      case 'SUBMITTED':
      default:
        return t('reviewer.filterAwaiting');
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className={styles.pageTitle}>{t('reviewer.pageTitle')}</h1>
            <p className={styles.pageSubtitle}>
              {t('reviewer.pageSubtitle')}
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t('reviewer.refreshBtn')}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>{t('reviewer.refreshBtn')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <section className={styles.statsGrid} aria-label="Statistik Review Laporan">
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>{t('reviewer.statAwaiting')}</span>
            <Clock size={18} color="var(--orange)" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{statValue(stats?.submitted)}</div>
          <div className={styles.statCardSubtext}>{t('reviewer.statAwaitingSub')}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>{t('reviewer.statApprovedToday')}</span>
            <CheckCircle2 size={18} color="var(--green)" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{statValue(stats?.approvedToday)}</div>
          <div className={styles.statCardSubtext}>{t('reviewer.statApprovedTodaySub')}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>{t('reviewer.statNeedsRevision')}</span>
            <RotateCcw size={18} color="#a16207" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{statValue(stats?.needsRevision)}</div>
          <div className={styles.statCardSubtext}>{t('reviewer.statNeedsRevisionSub')}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>{t('reviewer.statRejected')}</span>
            <XCircle size={18} color="var(--red)" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{statValue(stats?.rejected)}</div>
          <div className={styles.statCardSubtext}>{t('reviewer.statRejectedSub')}</div>
        </div>
      </section>

      {/* Quick Pending Review Queue */}
      <section aria-labelledby="queue-heading">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 id="queue-heading" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
              {t('reviewer.queueHeading')}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
              {t('reviewer.queueSub')}
            </p>
          </div>
          <Link href="/reviewer/reports" className={styles.actionButton}>
            <span>{t('common.seeAll')}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>{t('reviewer.loadingQueue')}</div>
          ) : error ? (
            <ReviewerLoadError error={error} onRetry={handleRefresh} />
          ) : pendingReports.length === 0 ? (
            <div className={styles.emptyState}>{t('reviewer.noPendingReports')}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('reviewer.tablePlace')}</th>
                  <th scope="col">{t('reviewer.tableReporter')}</th>
                  <th scope="col">{t('reviewer.tableElements')}</th>
                  <th scope="col">{t('reviewer.tableDate')}</th>
                  <th scope="col">{t('reviewer.tableStatus')}</th>
                  <th scope="col" style={{ textAlign: 'right' }}>{t('reviewer.tableAction')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map(report => {
                  return (
                    <tr key={report.id}>
                      <td>
                        <div className={styles.placeCell}>
                          <span className={styles.placeName}>{report.placeName}</span>
                          {report.placeAddress && <span className={styles.placeAddress}>{report.placeAddress}</span>}
                        </div>
                      </td>
                      <td>{report.reporterName}</td>
                      <td>
                        {report.elements.map(e => e.element.replace('_', ' ')).join(', ')}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                        {formatDate(report.createdAt, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeSubmitted}`}>
                          {getStatusLabel(report.reviewStatus)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/reviewer/reports/${report.id}`} className={styles.actionButton}>
                          <Eye size={14} aria-hidden="true" />
                          <span>{t('reviewer.inspectBtn')}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
