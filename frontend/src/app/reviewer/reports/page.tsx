'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye } from 'lucide-react';
import { fetchReviewerReports } from '@/lib/api';
import type { ReviewerAuditItem } from '@/types';
import { REVIEW_STATUS_META } from '@/types';
import styles from '../reviewer.module.css';

const FILTER_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: 'SUBMITTED', label: 'Menunggu Review' },
  { id: 'NEEDS_REVISION', label: 'Perlu Revisi' },
  { id: 'APPROVED', label: 'Disetujui' },
  { id: 'REJECTED', label: 'Ditolak' },
];

export default function ReviewerReportsPage() {
  const [reports, setReports] = useState<ReviewerAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchReviewerReports({
        status: activeFilter,
        search: searchQuery,
      });
      setReports(data.reports);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchReviewerReports({
      status: activeFilter,
      search: searchQuery,
    })
      .then(data => {
        if (active) {
          setReports(data.reports);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error loading reports:', err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeFilter, searchQuery]);


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

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Laporan Masuk</h1>
        <p className={styles.pageSubtitle}>
          Daftar seluruh laporan kondisi akses dari kontributor warga yang perlu diperiksa dan diverifikasi.
        </p>
      </div>

      {/* Toolbar: Filters & Search */}
      <div className={styles.toolbar}>
        <div className={styles.filterTabs} role="tablist" aria-label="Filter status laporan">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={activeFilter === opt.id}
              className={`${styles.filterTab} ${activeFilter === opt.id ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchBox} role="search">
          <Search size={16} color="var(--muted)" aria-hidden="true" />
          <input
            type="search"
            placeholder="Cari tempat atau pelapor…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Cari tempat atau pelapor"
          />
        </form>
      </div>

      {/* Reports Table / Card List */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Memuat daftar laporan…</div>
        ) : reports.length === 0 ? (
          <div className={styles.emptyState}>
            {activeFilter === 'SUBMITTED' || activeFilter === 'all'
              ? 'Belum ada laporan yang menunggu review.'
              : 'Tidak ada laporan yang sesuai dengan filter.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Bukti</th>
                <th scope="col">Tempat</th>
                <th scope="col">Pelapor</th>
                <th scope="col">Elemen Akses</th>
                <th scope="col">Tanggal Laporan</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => {
                const meta = REVIEW_STATUS_META[report.reviewStatus] ?? REVIEW_STATUS_META.SUBMITTED;
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
                      {new Date(report.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(report.reviewStatus)}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/reviewer/reports/${report.id}`} className={styles.actionButton}>
                        <Eye size={14} aria-hidden="true" />
                        <span>Periksa</span>
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
