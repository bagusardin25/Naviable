'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, RotateCcw, XCircle, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { fetchReviewerStats, fetchReviewerReports } from '@/lib/api';
import type { ReviewerStats, ReviewerAuditItem } from '@/types';
import { REVIEW_STATUS_META } from '@/types';
import styles from './reviewer.module.css';

export default function ReviewerDashboardPage() {
  const [stats, setStats] = useState<ReviewerStats | null>(null);
  const [pendingReports, setPendingReports] = useState<ReviewerAuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function handleRefresh() {
    setLoading(true);
    try {
      const [statsData, reportsData] = await Promise.all([
        fetchReviewerStats(),
        fetchReviewerReports({ status: 'SUBMITTED', limit: 5 }),
      ]);
      setStats(statsData);
      setPendingReports(reportsData.reports);
    } catch (err) {
      console.error('Error refreshing reviewer dashboard:', err);
    } finally {
      setLoading(false);
    }
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
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error loading reviewer dashboard:', err);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard Reviewer</h1>
            <p className={styles.pageSubtitle}>
              Pemeriksaan bukti foto dan validasi laporan kondisi aksesibilitas masyarakat Surabaya.
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Segarkan data dashboard"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <section className={styles.statsGrid} aria-label="Statistik Review Laporan">
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>Menunggu Review</span>
            <Clock size={18} color="var(--orange)" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{stats?.submitted ?? (loading ? '…' : 0)}</div>
          <div className={styles.statCardSubtext}>Laporan warga baru masuk</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>Disetujui Hari Ini</span>
            <CheckCircle2 size={18} color="var(--green)" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{stats?.approvedToday ?? (loading ? '…' : 0)}</div>
          <div className={styles.statCardSubtext}>Bukti telah diperiksa & dipublikasikan</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>Perlu Revisi</span>
            <RotateCcw size={18} color="#a16207" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{stats?.needsRevision ?? (loading ? '…' : 0)}</div>
          <div className={styles.statCardSubtext}>Menunggu konfirmasi ulang pelapor</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>Ditolak</span>
            <XCircle size={18} color="var(--red)" aria-hidden="true" />
          </div>
          <div className={styles.statCardValue}>{stats?.rejected ?? (loading ? '…' : 0)}</div>
          <div className={styles.statCardSubtext}>Foto tidak relevan / tidak sesuai</div>
        </div>
      </section>

      {/* Quick Pending Review Queue */}
      <section aria-labelledby="queue-heading">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 id="queue-heading" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
              Laporan Menunggu Tindakan
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
              Prioritas laporan masuk yang belum diperiksa oleh tim.
            </p>
          </div>
          <Link href="/reviewer/reports" className={styles.actionButton}>
            <span>Lihat Semua</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>Memuat antrean laporan…</div>
          ) : pendingReports.length === 0 ? (
            <div className={styles.emptyState}>Belum ada laporan yang menunggu review.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tempat</th>
                  <th scope="col">Pelapor</th>
                  <th scope="col">Elemen Akses</th>
                  <th scope="col">Tanggal Laporan</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map(report => {
                  const meta = REVIEW_STATUS_META[report.reviewStatus] ?? REVIEW_STATUS_META.SUBMITTED;
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
                        {new Date(report.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeSubmitted}`}>
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
      </section>
    </div>
  );
}
