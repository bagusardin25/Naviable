'use client';

import React, { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { LoginForm } from './login-form';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import styles from './login.module.css';

export function LoginContent() {
  const { t, locale } = useTranslation();

  return (
    <main className={styles.page} lang={locale}>
      <section className={styles.brandPanel} aria-label={t('auth.loginBrandPanelAria')}>
        <div className={styles.brandContent}>
          <Link href="/" className={styles.brand} aria-label={`NaviAble — ${t('nav.backToHome')}`}>
            <BrandLogo size={40} priority />
            <span>NaviAble</span>
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
          <div className={styles.topBar}>
            <Link href="/" className={styles.backLink}>
              {t('auth.backToHome')}
            </Link>
            <LanguageSwitcher size="sm" />
          </div>

          <Suspense fallback={<p role="status">{t('auth.preparingLogin')}</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
