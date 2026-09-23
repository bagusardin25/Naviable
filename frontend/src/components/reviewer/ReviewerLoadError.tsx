'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';
import { ReviewerSessionError } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';
import styles from '@/app/reviewer/reviewer.module.css';

export function reviewerLoginHref(pathname: string) {
  return `/login?mode=reviewer&next=${encodeURIComponent(pathname)}`;
}

/**
 * Shown in place of reviewer data that could not be loaded. An expired session gets a
 * "sign in again" link back to this page; anything else shows the server's reason.
 */
export function ReviewerLoadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const expired = error instanceof ReviewerSessionError;
  return (
    <div className={styles.errorState} role="alert">
      <AlertTriangle size={22} color={expired ? 'var(--orange)' : 'var(--red)'} aria-hidden="true" />
      <strong>{expired ? t('reviewer.sessionExpiredTitle') : t('reviewer.loadFailedTitle')}</strong>
      <p>{expired ? t('reviewer.sessionExpiredBody') : error instanceof Error && error.message ? error.message : t('common.error')}</p>
      {expired ? (
        <Link href={reviewerLoginHref(pathname)} className={styles.actionButton}>
          <LogIn size={14} aria-hidden="true" />
          <span>{t('reviewer.loginAgainBtn')}</span>
        </Link>
      ) : onRetry ? (
        <button type="button" className={styles.secondaryButton} onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          <span>{t('common.retry')}</span>
        </button>
      ) : null}
    </div>
  );
}
