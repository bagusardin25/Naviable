'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye } from 'lucide-react';
import { fetchReviewerReports } from '@/lib/api';
import type { ReviewerAuditItem } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewerLoadError } from '@/components/reviewer/ReviewerLoadError';
import styles from '../reviewer.module.css';

export default function ReviewerReportsPage() {
  const { t, formatDate } = useTranslation();
  const [reports, setReports] = useState<ReviewerAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // What was actually searched: typing only searches once it pauses (or on Enter), so a
  // query no longer spends one request per keystroke of the reviewer rate limit.
  const [appliedSearch, setAppliedSearch] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  const filterOptions = [
    { id: 'all', label: t('reviewer.filterAll') },
    { id: 'SUBMITTED', label: t('reviewer.filterAwaiting') },
    { id: 'NEEDS_REVISION', label: t('reviewer.filterRevision') },
    { id: 'APPROVED', label: t('reviewer.filterApproved') },
    { id: 'REJECTED', label: t('reviewer.filterRejected') },
  ];

  useEffect(() => {
    const next = searchQuery.trim();
    if (next === appliedSearch) return;
    const timer = window.setTimeout(() => { setLoading(true); setAppliedSearch(next); }, 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery, appliedSearch]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAppliedSearch(searchQuery.trim());
    setAttempt(n => n + 1);
  }

  function selectFilter(id: string) {
    if (id === activeFilter) return;
    setLoading(true);
    setActiveFilter(id);
  }

  useEffect(() => {
    let active = true;
    fetchReviewerReports({
      status: activeFilter,
      search: appliedSearch,
    })
      .then(data => {
        if (active) {
          setReports(data.reports);
          setError(null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error loading reports:', err);
        if (active) {
          setReports([]);
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [activeFilter, appliedSearch, attempt]);

  function getBadgeClass(status: string) {
    switch (status) {
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return styles.badgeSubmitted;
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
      case 'SUBMITTED':
      default:
        return t('reviewer.filterAwaiting');
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('reviewer.incomingPageTitle')}</h1>
        <p className={styles.pageSubtitle}>
          {t('reviewer.incomingPageSub')}
        </p>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className={styles.toolbar}>
        <div className={styles.filterTabs} role="tablist" aria-label="Filter status laporan">
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === opt.id}
              className={`${styles.filterTab} ${activeFilter === opt.id ? styles.filterTabActive : ''}`}
              onClick={() => selectFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchBox} role="search">
          <Search size={16} color="var(--muted)" aria-hidden="true" />
          <input
            type="search"
            placeholder={t('reviewer.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label={t('reviewer.searchPlaceholder')}
          />
        </form>
      </div>

      {/* Reports Table / Card List */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>{t('common.loading')}</div>
        ) : error ? (
          <ReviewerLoadError error={error} onRetry={() => { setLoading(true); setAttempt(n => n + 1); }} />
        ) : reports.length === 0 ? (
          <div className={styles.emptyState}>
            {activeFilter === 'SUBMITTED' || activeFilter === 'all'
              ? t('reviewer.noPendingReports')
              : t('reviewer.noPendingReports')}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('common.photo')}</th>
                <th scope="col">{t('reviewer.tablePlace')}</th>
                <th scope="col">{t('reviewer.tableReporter')}</th>
                <th scope="col">{t('reviewer.tableElements')}</th>
                <th scope="col">{t('reviewer.tableDate')}</th>
                <th scope="col">{t('reviewer.tableStatus')}</th>
                <th scope="col" style={{ textAlign: 'right' }}>{t('reviewer.tableAction')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => {
                return (
                  <tr key={report.id}>
                    <td style={{ width: '60px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--surface-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--line)',
                          position: 'relative',
                        }}
                      >
                        {report.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={report.photoUrl}
                            alt={`Bukti foto ${report.placeName}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>No pic</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.placeCell}>
                        <span className={styles.placeName}>{report.placeName}</span>
                        {report.placeAddress && (
                          <span className={styles.placeAddress}>{report.placeAddress}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{report.reporterName}</td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
                        {report.elements.map(e => e.element.replace('_', ' ')).join(', ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                      {formatDate(report.createdAt, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(report.reviewStatus)}`}>
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
    </div>
  );
}
