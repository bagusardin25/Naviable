'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
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
  const signedIn = Boolean(userProfile);
  const updates = signedIn ? contributionUpdates : 0;

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label={t('nav.backToHome')}>
        <BrandLogo size={40} className="brand-mark" priority />
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
