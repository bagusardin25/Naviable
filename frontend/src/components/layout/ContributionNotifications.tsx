'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { ContributionReport, ReviewStatus } from '@/lib/api';
import { reviewedReports } from '@/lib/contributionUpdates';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

export type ContributionNotificationsProps = {
  /** The signed-in contributor's own reports (from /api/me). */
  reports: ContributionReport[];
  /** Reports whose current decision this device has not seen yet. */
  unseenIds: Set<string>;
  onMarkSeen: () => void;
  onOpenProfile: () => void;
  /** Hide the arrival toast, e.g. while the profile (which lists everything) is open. */
  suppressToast?: boolean;
};

type Outcome = 'approved' | 'rejected' | 'needsRevision';

const OUTCOME_BY_STATUS: Partial<Record<ReviewStatus, Outcome>> = {
  APPROVED: 'approved',
  PUBLISHED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVISION: 'needsRevision',
};
const OUTCOME_ICON: Record<Outcome, string> = {
  approved: 'check-circle',
  rejected: 'x-circle',
  needsRevision: 'alert-circle',
};
const MAX_ITEMS = 10;
const TOAST_MS = 10_000;

// True only after hydration (the server snapshot is false), so the portaled toast is never
// part of the server HTML and cannot cause a hydration mismatch.
const noopSubscribe = () => () => {};
const useCanPortal = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/**
 * Tells contributors when a reviewer has approved, rejected, or asked them to revise a
 * contribution (a new place or a change report): a bell with an unread count, a panel
 * listing recent decisions, and a toast when a new decision arrives.
 */
export function ContributionNotifications({ reports, unseenIds, onMarkSeen, onOpenProfile, suppressToast = false }: ContributionNotificationsProps) {
  const { t, formatDate } = useTranslation();
  const [open, setOpen] = useState(false);
  // Which items were new when the panel opened; the panel marks them seen immediately,
  // so this snapshot keeps their "New" tag visible while it stays open.
  const [newWhenOpened, setNewWhenOpened] = useState<Set<string>>(new Set());
  const [dismissedToastIds, setDismissedToastIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const canPortal = useCanPortal();

  const decisions = useMemo(() => reviewedReports(reports).slice(0, MAX_ITEMS), [reports]);
  const unseenCount = unseenIds.size;

  const toastItems = useMemo(
    () => reviewedReports(reports).filter((r) => unseenIds.has(r.id) && !dismissedToastIds.has(r.id)),
    [reports, unseenIds, dismissedToastIds]
  );
  const showToast = !suppressToast && !open && toastItems.length > 0;
  const toastKey = toastItems.map((r) => r.id).join('|');

  // A toast is a heads-up, not the record: it steps aside on its own, and the
  // decisions stay listed behind the bell.
  useEffect(() => {
    if (!showToast) return;
    const ids = toastKey.split('|');
    const timer = window.setTimeout(() => {
      setDismissedToastIds((prev) => new Set([...prev, ...ids]));
    }, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [showToast, toastKey]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        bellRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function openPanel() {
    setNewWhenOpened(new Set(unseenIds));
    setOpen(true);
    if (unseenCount > 0) onMarkSeen();
  }

  function message(report: ContributionReport) {
    const outcome = OUTCOME_BY_STATUS[report.reviewStatus ?? 'SUBMITTED'] ?? 'approved';
    return t(`notifications.${outcome}`, { place: report.placeName || t('notifications.unknownPlace') });
  }

  const newest = toastItems[0];
  const newestOutcome = newest ? OUTCOME_BY_STATUS[newest.reviewStatus ?? 'SUBMITTED'] ?? 'approved' : 'approved';

  return (
    <div ref={containerRef} className="notif-center">
      <button
        ref={bellRef}
        type="button"
        className={`notif-bell-btn ${open ? 'active' : ''}`}
        aria-label={unseenCount > 0 ? t('notifications.bellAriaUnread', { count: unseenCount }) : t('notifications.bellAria')}
        aria-expanded={open}
        aria-controls="notif-panel"
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        <Icon name="bell" size={18} />
        {unseenCount > 0 && (
          <span className="notif-badge" aria-hidden="true">{unseenCount > 9 ? '9+' : unseenCount}</span>
        )}
      </button>

      {open && (
        <section id="notif-panel" className="notif-panel" aria-labelledby="notif-panel-title">
          <div className="notif-panel-head">
            <h2 id="notif-panel-title">{t('notifications.title')}</h2>
            <button type="button" className="notif-icon-btn" onClick={() => setOpen(false)} aria-label={t('common.close')}>
              <Icon name="close" size={14} />
            </button>
          </div>

          {decisions.length === 0 ? (
            <p className="notif-empty">{t('notifications.empty')}</p>
          ) : (
            <ul className="notif-list">
              {decisions.map((report) => {
                const outcome = OUTCOME_BY_STATUS[report.reviewStatus ?? 'SUBMITTED'] ?? 'approved';
                const decidedAt = report.reviewedAt ?? report.createdAt;
                return (
                  <li key={report.id} className={`notif-item is-${outcome}`}>
                    <Icon name={OUTCOME_ICON[outcome]} size={18} className="notif-item-icon" />
                    <div className="notif-item-body">
                      <p className="notif-item-text">
                        {newWhenOpened.has(report.id) && <span className="notif-new-tag">{t('notifications.newTag')}</span>}
                        {message(report)}
                      </p>
                      {report.reviewNote?.trim() && (
                        <p className="notif-item-note">
                          <strong>{t('notifications.noteLabel')}</strong> {report.reviewNote}
                        </p>
                      )}
                      <time className="notif-item-time" dateTime={decidedAt}>
                        {formatDate(new Date(decidedAt), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="notif-panel-foot">
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
            >
              {t('notifications.viewProfile')}
            </button>
          </div>
        </section>
      )}

      {/* Portaled to <body>: the top bar's backdrop-filter would otherwise become the
          containing block for this fixed toast and pin it to the bar, not the viewport. */}
      {showToast && newest && canPortal && createPortal(
        <div className={`notif-toast is-${newestOutcome}`} role="status">
          <Icon name={OUTCOME_ICON[newestOutcome]} size={18} className="notif-item-icon" />
          <p>{toastItems.length > 1 ? t('notifications.toastSummary', { count: toastItems.length }) : message(newest)}</p>
          <button type="button" className="notif-toast-view" onClick={openPanel}>
            {t('notifications.toastView')}
          </button>
          <button
            type="button"
            className="notif-icon-btn"
            aria-label={t('notifications.toastDismiss')}
            onClick={() => setDismissedToastIds((prev) => new Set([...prev, ...toastItems.map((r) => r.id)]))}
          >
            <Icon name="close" size={14} />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
