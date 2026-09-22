'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, History, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import styles from '@/app/reviewer/reviewer.module.css';

interface ReviewerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ReviewerSidebar({ isOpen, onClose }: ReviewerSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const navItems = [
    { href: '/reviewer', label: t('reviewer.dashboardNav'), icon: LayoutDashboard, exact: true },
    { href: '/reviewer/reports', label: t('reviewer.incomingNav'), icon: ClipboardList, exact: false },
    { href: '/reviewer/history', label: t('reviewer.historyNav'), icon: History, exact: false },
    { href: '/jelajah', label: t('reviewer.backToMapNav'), icon: MapPin, exact: false },
  ];

  async function handleLogout() {
    try {
      await fetch('/api/auth/reviewer-logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`} aria-label={t('reviewer.panelTitle')}>
      <div className={styles.sidebarHeader}>
        <Link href="/" className={styles.sidebarBrand} onClick={onClose}>
          <BrandLogo size={32} />
          <span>NaviAble</span>
        </Link>
        <span className={styles.badgeReviewer}>{t('reviewer.badge')}</span>
      </div>

      <nav className={styles.sidebarNav}>
        {navItems.map(item => {
          const IconComponent = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && (item.href !== '/reviewer' || pathname === '/reviewer');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <IconComponent size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div style={{ paddingBottom: '12px', display: 'flex', justifyContent: 'center' }}>
          <LanguageSwitcher size="sm" />
        </div>

        <div className={styles.reviewerProfile}>
          <div className={styles.reviewerAvatar} aria-hidden="true">
            {auth.profile?.initials ?? 'R'}
          </div>
          <div className={styles.reviewerInfo}>
            <div className={styles.reviewerTitle}>{auth.profile?.displayName ?? 'Reviewer Naviable'}</div>
            <div className={styles.reviewerHandle}>{auth.profile?.email ?? 'Reviewer terverifikasi'}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={styles.logoutButton}
          aria-label={t('reviewer.logoutNav')}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>{t('reviewer.logoutNav')}</span>
        </button>
      </div>
    </aside>
  );
}
