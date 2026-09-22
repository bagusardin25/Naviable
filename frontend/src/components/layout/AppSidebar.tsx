'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Screen } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import type { AuthUserProfile } from '@/lib/auth/user-profile';

type AppSidebarProps = {
  currentScreen: Screen;
  onSelectScreen: (screen: Screen) => void;
  authReady: boolean;
  userProfile: AuthUserProfile | null;
  contributionUpdates?: number;
};

export function AppSidebar({ currentScreen, onSelectScreen, authReady, userProfile, contributionUpdates = 0 }: AppSidebarProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const signedIn = Boolean(userProfile);
  const updates = signedIn ? contributionUpdates : 0;

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label={t('nav.backToHome')}>
        {!imgError ? (
          <Image
            src="/logo-only-light-3.png"
            alt="NaviAble Logo"
            width={40}
            height={40}
            className="brand-mark"
            priority
            onError={() => setImgError(true)}
          />
        ) : (
          <svg className="brand-svg-fallback" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4C14 4 9 9 9 15C9 24 20 36 20 36C20 36 31 24 31 15C31 9 26 4 20 4Z" fill="#6b46c1" />
            <path d="M20 4C26 4 31 9 31 15C31 19 28 24 20 36V20H31" fill="#0d9488" />
            <path d="M9 15C9 24 20 36 20 36V20H9" fill="#f1b80c" />
            <path d="M20 20H31C28 26 20 36 20 36V20" fill="#ec4899" />
            <ellipse cx="20" cy="22" rx="17" ry="5" stroke="#e2e8f0" strokeWidth="2" fill="none" />
          </svg>
        )}
        <span>NaviAble</span>
      </Link>

      <nav aria-label={t('nav.mainNavLabel')}>
        <button
          id="nav-map"
          type="button"
          className={currentScreen === 'map' ? 'active' : ''}
          onClick={() => onSelectScreen('map')}
          aria-label={t('nav.explore')}
          aria-current={currentScreen === 'map' ? 'page' : undefined}
        >
          <Icon name="map" />
          <span>{t('nav.explore')}</span>
        </button>
        <button
          id="nav-report"
          type="button"
          className={currentScreen === 'add' ? 'active' : ''}
          onClick={() => onSelectScreen('add')}
          aria-label={t('nav.addPlace')}
          aria-current={currentScreen === 'add' ? 'page' : undefined}
        >
          <Icon name="report" />
          <span className="nav-label-full">{t('nav.addPlace')}</span>
          <span className="nav-label-mobile">{t('nav.addPlaceMobile')}</span>
        </button>
        <button
          id="nav-dashboard"
          type="button"
          className={currentScreen === 'dashboard' ? 'active' : ''}
          onClick={() => onSelectScreen('dashboard')}
          aria-label={t('nav.dashboard')}
          aria-current={currentScreen === 'dashboard' ? 'page' : undefined}
        >
          <Icon name="dashboard" />
          <span className="nav-label-full">{t('nav.dashboard')}</span>
          <span className="nav-label-mobile">{t('nav.dashboardMobile')}</span>
        </button>
        <button
          id="nav-profile"
          type="button"
          className={currentScreen === 'profile' ? 'active' : ''}
          onClick={() => onSelectScreen('profile')}
          aria-label={`${userProfile ? `${t('nav.myContributions')} — ${userProfile.displayName}` : t('nav.signIn')}${updates > 0 ? t('nav.contributionUpdatesAria', { count: updates }) : ''}`}
          title={userProfile?.displayName}
          aria-current={currentScreen === 'profile' ? 'page' : undefined}
          style={{ position: 'relative' }}
        >
          <Icon name="user" />
          <span className="nav-label-full">{signedIn ? t('nav.myContributions') : t('nav.signIn')}</span>
          <span className="nav-label-mobile">{userProfile?.shortName ?? (signedIn ? t('nav.myContributions') : t('nav.signIn'))}</span>
          {updates > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '6px',
                right: '10px',
                minWidth: '16px',
                height: '16px',
                padding: '0 4px',
                borderRadius: '999px',
                background: '#dc2626',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                boxShadow: '0 0 0 2px var(--surface, #fff)',
              }}
            >
              {updates > 9 ? '9+' : updates}
            </span>
          )}
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="avatar" aria-hidden="true">
          {userProfile ? userProfile.initials : <Icon name="user" />}
        </div>
        <div className="sidebar-account-copy">
          <strong title={userProfile?.displayName}>
            {!authReady ? t('common.checkingSession') : userProfile?.displayName ?? t('common.guestMode')}
          </strong>
          <span title={userProfile?.email}>
            {!authReady ? t('common.pleaseWait') : userProfile?.email ?? t('common.exploreWithoutAccount')}
          </span>
        </div>
      </div>
    </aside>
  );
}
