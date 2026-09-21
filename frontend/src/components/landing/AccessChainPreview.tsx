'use client';

import { DoorOpen, MoveUpRight, Bath, Check, TriangleAlert, CircleHelp, MapPin } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import styles from '@/app/landing.module.css';

export function AccessChainPreview() {
  const { t } = useTranslation();

  return (
    <figure className={styles.preview} aria-labelledby="preview-caption">
      <div className={styles.previewTop}>
        <span><span className={styles.smallDot} /> {t('landing.previewTag')}</span>
        <span>{t('landing.previewLocation')}</span>
      </div>
      <div className={styles.building} aria-hidden="true">
        <svg viewBox="0 0 480 230" fill="none">
          <path d="M38 203H449M55 215H420" stroke="currentColor" strokeOpacity=".14" />
          <path d="M121 78L231 37L361 78L247 126L121 78Z" fill="#e6dcf8" stroke="#b8a3df" />
          <path d="M121 78V175L247 222V126L121 78Z" fill="#f6f2fe" stroke="#b8a3df" />
          <path d="M247 126L361 78V174L247 222V126Z" fill="#d9cbee" stroke="#b8a3df" />
          <path d="M146 107L177 119V150L146 139V107ZM193 125L224 137V168L193 157V125Z" fill="#bca5e4" />
          <path d="M273 142L304 129V198L273 211V142Z" fill="#72509f" />
          <path d="M323 120L345 111V140L323 149V120Z" fill="#a48ace" />
          <path d="M273 211L304 198L411 210L379 225L273 211Z" fill="#fff" stroke="#a48ace" />
          <path d="M308 191L406 201M308 191V179M406 201V189" stroke="#9678c1" strokeWidth="3" strokeLinecap="round" />
          <path d="M357 208L365 188L373 210Z" fill="#b35b16" /><path d="M359 203H371" stroke="#fff" strokeWidth="3" />
          <circle cx="80" cy="156" r="20" fill="#d1dcc8" /><path d="M80 170V203M80 182L91 172" stroke="#64745c" strokeWidth="3" strokeLinecap="round" />
          <path d="M231 37V18" stroke="var(--lp-purple, #6d45cc)" strokeWidth="2" /><circle cx="231" cy="14" r="5" fill="var(--lp-purple, #6d45cc)" />
        </svg>
        <span className={styles.buildingTag}><MapPin size={14} /> {t('landing.previewSampleBuilding')}</span>
      </div>
      <figcaption id="preview-caption">
        <strong>{t('landing.previewCaptionBold')}</strong>
        <span>{t('landing.previewCaptionSub')}</span>
      </figcaption>
      <ol className={styles.previewRows}>
        <li>
          <span className={styles.facilityIcon}><DoorOpen size={20} aria-hidden="true" /></span>
          <span><small>E1 / {t('elements.E1.sub')}</small><strong>{t('elements.E1.name')}</strong></span>
          <span className={styles.good}><Check size={14} aria-hidden="true" /> {t('status.UTUH.label')}</span>
        </li>
        <li>
          <span className={styles.facilityIcon}><MoveUpRight size={20} aria-hidden="true" /></span>
          <span><small>E2 / {t('elements.E2.sub')}</small><strong>{t('elements.E2.name')}</strong></span>
          <span className={styles.caution}><TriangleAlert size={14} aria-hidden="true" /> {t('status.TERHALANG.label')}</span>
        </li>
        <li>
          <span className={styles.facilityIcon}><Bath size={20} aria-hidden="true" /></span>
          <span><small>E3 / {t('elements.E3.sub')}</small><strong>{t('elements.E3.name')}</strong></span>
          <span className={styles.unknown}><CircleHelp size={14} aria-hidden="true" /> {t('status.BELUM_DIKETAHUI.label')}</span>
        </li>
      </ol>
      <p className={styles.previewNote}><CircleHelp size={15} aria-hidden="true" /> {t('landing.previewIllustrationNote')}</p>
    </figure>
  );
}
