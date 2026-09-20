'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, History, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/app/reviewer/reviewer.module.css';

interface ReviewerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ReviewerSidebar({ isOpen, onClose }: ReviewerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const navItems = [
    { href: '/reviewer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/reviewer/reports', label: 'Laporan Masuk', icon: ClipboardList, exact: false },
    { href: '/reviewer/history', label: 'Riwayat Review', icon: History, exact: false },
    { href: '/jelajah', label: 'Kembali ke Peta', icon: MapPin, exact: false },
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
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`} aria-label="Navigasi Reviewer">
      <div className={styles.sidebarHeader}>
        <Link href="/" className={styles.sidebarBrand} onClick={onClose}>
          <Image src="/logo-only-light-3.png" alt="NaviAble Logo" width={32} height={32} />
          <span>NaviAble</span>
        </Link>
        <span className={styles.badgeReviewer}>Reviewer</span>
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
          aria-label="Keluar dari akun reviewer"
        >
          <LogOut size={16} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
