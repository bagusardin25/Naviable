'use client';

import React, { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import styles from './login.module.css';

export function LoginContent({ robotoClass = '', interVar = '' }: { robotoClass?: string; interVar?: string } = {}) {
  const { t, locale } = useTranslation();

  return (
    <main className={`${styles.page} ${robotoClass} ${interVar}`.trim()} lang={locale}>
      <section className={styles.brandPanel} aria-label={t('auth.loginBrandPanelAria')}>
        <div className={styles.brandContent}>
          <Link href="/" className={styles.wordmark} aria-label={`NaviAble — ${t('nav.backToHome')}`}>
            <Image
              src="/logo-only-light-3.png"
              alt="NaviAble Logo"
              width={48}
              height={48}
              style={{ objectFit: 'contain' }}
              priority
            />
            <span aria-hidden="true">Navi<span className={styles.brandAccent}>able</span></span>
          </Link>

          <p className={styles.tagline}>
            {t('auth.loginTagline')}
          </p>

          <Image
            className={styles.illustration}
            src="/images/login-community.svg"
            alt={t('auth.illustrationAlt')}
            width={420}
            height={264}
            priority
          />

          <ul className={styles.badges} aria-label="Fitur aksesibilitas">
            <li><Icon name="access" size={16} /> <span>{t('auth.badgeWheelchair')}</span></li>
            <li><Icon name="volume" size={16} /> <span>{t('auth.badgeAudio')}</span></li>
            <li><Icon name="eye" size={16} /> <span>{t('auth.badgeContrast')}</span></li>
          </ul>
        </div>
      </section>

      <section className={styles.formPanel} aria-labelledby="login-heading">
        <div className={styles.formContent}>
          <Link href="/jelajah" className={styles.backLink}>
            {t('auth.backToMap')}
          </Link>

          <header className={styles.heading}>
            <h1 id="login-heading">{t('auth.welcomeHeading')}</h1>
            <p>{t('auth.welcomeSub')}</p>
          </header>
          <Suspense fallback={<p role="status">{t('auth.preparingLogin')}</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
