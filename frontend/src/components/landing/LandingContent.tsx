'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  DoorOpen,
  MoveUpRight,
  Bath,
  ArrowUpDown,
  Footprints,
  SquareParking,
  Signpost,
  PersonStanding,
  Check,
  TriangleAlert,
  CircleHelp,
  CircleX,
  CircleAlert,
  MapPin,
  Search,
  ScanEye,
  Camera,
  ClipboardCheck,
  Send,
  Globe,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { AccessChainPreview } from '@/components/landing/AccessChainPreview';
import styles from '@/app/landing.module.css';

export function LandingContent() {
  const { t } = useTranslation();

  const elements = [
    { icon: DoorOpen, name: t('elements.E1.name'), detail: t('elements.E1.detail') },
    { icon: MoveUpRight, name: t('elements.E2.name'), detail: t('elements.E2.detail') },
    { icon: Bath, name: t('elements.E3.name'), detail: t('elements.E3.detail') },
    { icon: ArrowUpDown, name: t('elements.E4.name'), detail: t('elements.E4.detail') },
    { icon: Footprints, name: t('elements.E5.name'), detail: t('elements.E5.detail') },
    { icon: SquareParking, name: t('elements.E6.name'), detail: t('elements.E6.detail') },
    { icon: Signpost, name: t('elements.E7.name'), detail: t('elements.E7.detail') },
    { icon: PersonStanding, name: t('elements.E8.name'), detail: t('elements.E8.detail') },
  ];

  const statuses = [
    { icon: Check, label: t('status.UTUH.label'), className: styles.good },
    { icon: TriangleAlert, label: t('status.TERHALANG.label'), className: styles.caution },
    { icon: CircleAlert, label: t('status.TIDAK_STANDAR.label'), className: styles.attention },
    { icon: CircleX, label: t('status.TIDAK_ADA.label'), className: styles.absent },
    { icon: CircleHelp, label: t('status.BELUM_DIKETAHUI.label'), className: styles.unknown },
  ];

  const questions = [
    [t('landing.q1'), t('landing.a1')],
    [t('landing.q2'), t('landing.a2')],
    [t('landing.q3'), t('landing.a3')],
    [t('landing.q4'), t('landing.a4')],
  ];

  return (
    <main id="konten-utama" tabIndex={-1}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <MapPin size={15} aria-hidden="true" /> {t('landing.heroEyebrow')}
          </p>
          <h1 id="hero-title">
            {t('landing.heroTitleLine1')} <span>{t('landing.heroTitleLine2')}</span>
          </h1>
          <p className={styles.heroDescription}>{t('landing.heroDescription')}</p>
          <div className={styles.heroActions}>
            <Link href="/jelajah" prefetch={false} className={styles.primary}>
              {t('landing.exploreMap')} <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <a href="#cara-kerja" className={styles.textLink}>
              {t('landing.seeHowItWorks')} <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>
          <p className={styles.heroNote}>
            <Check size={16} aria-hidden="true" /> {t('landing.canExploreWithoutAccount')}
          </p>
          <div className={styles.heroFootnote}>
            <span className={styles.noteLine} />
            <p>
              {t('landing.heroFootnotePrefix')}
              <strong>{t('landing.heroFootnoteBold')}</strong>
              <br />
              {t('landing.heroFootnoteSuffix')}
            </p>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <span className={styles.visualIndex} aria-hidden="true">
            {t('landing.previewVisualIndex')}
          </span>
          <AccessChainPreview />
        </div>
      </section>

      <section className={styles.problem} aria-labelledby="problem-title">
        <div className={styles.problemInner}>
          <span className={styles.sectionNumber}>{t('landing.problemSectionNumber')}</span>
          <h2 id="problem-title">
            {t('landing.problemTitleLine1')}
            <br />
            <span>{t('landing.problemTitleLine2')}</span>
          </h2>
          <p>{t('landing.problemDescription')}</p>
        </div>
      </section>

      <section id="rantai-akses" className={styles.section} aria-labelledby="chain-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{t('landing.chainEyebrow')}</p>
            <h2 id="chain-title">
              {t('landing.chainTitle')}
            </h2>
          </div>
          <p>{t('landing.chainDescription')}</p>
        </div>
        <ol className={styles.elements}>
          {elements.map(({ icon: ElementIcon, name, detail }, index) => (
            <li key={name}>
              <div className={styles.elementTop}>
                <ElementIcon size={27} strokeWidth={1.5} aria-hidden="true" />
                <span>E{index + 1}</span>
              </div>
              <h3>{name}</h3>
              <p>{detail}</p>
            </li>
          ))}
        </ol>
        <div className={styles.statusLegend}>
          <p>
            <strong>{t('landing.legendTitleBold')}</strong> {t('landing.legendTitleSub')}
          </p>
          <ul aria-label={t('landing.legendAriaLabel')}>
            {statuses.map(({ icon: StatusIcon, label, className }) => (
              <li className={className} key={label}>
                <StatusIcon size={15} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <small>{t('landing.legendNote')}</small>
        </div>
      </section>

      <section id="cara-kerja" className={styles.howSection} aria-labelledby="how-title">
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{t('landing.howEyebrow')}</p>
              <h2 id="how-title">{t('landing.howTitle')}</h2>
            </div>
            <Link href="/jelajah" prefetch={false} className={styles.textLink}>
              {t('landing.openSurabayaMap')} <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
          </div>
          <ol className={styles.steps}>
            <li>
              <div className={styles.stepTop}>
                <span>{t('landing.step1Num')}</span>
                <Search size={24} aria-hidden="true" />
              </div>
              <h3>{t('landing.step1Title')}</h3>
              <p>{t('landing.step1Desc')}</p>
              <span className={styles.stepCaption}>{t('landing.step1Caption')}</span>
            </li>
            <li>
              <div className={styles.stepTop}>
                <span>{t('landing.step2Num')}</span>
                <ScanEye size={24} aria-hidden="true" />
              </div>
              <h3>{t('landing.step2Title')}</h3>
              <p>{t('landing.step2Desc')}</p>
              <span className={styles.stepCaption}>{t('landing.step2Caption')}</span>
            </li>
            <li>
              <div className={styles.stepTop}>
                <span>{t('landing.step3Num')}</span>
                <ArrowUpRight size={24} aria-hidden="true" />
              </div>
              <h3>{t('landing.step3Title')}</h3>
              <p>{t('landing.step3Desc')}</p>
              <span className={styles.stepCaption}>{t('landing.step3Caption')}</span>
            </li>
          </ol>
        </div>
      </section>

      <section
        id="tentang-data"
        className={`${styles.section} ${styles.trust}`}
        aria-labelledby="trust-title"
      >
        <div className={styles.trustCopy}>
          <p className={styles.eyebrow}>{t('landing.trustEyebrow')}</p>
          <h2 id="trust-title">
            {t('landing.trustTitle1')}
            <br />
            <span>{t('landing.trustTitle2')}</span>
          </h2>
          <p>{t('landing.trustDesc')}</p>
          <div className={styles.trustNote}>
            <CircleHelp size={21} aria-hidden="true" />
            <p>{t('landing.trustNote')}</p>
          </div>
        </div>
        <div className={styles.evidenceList}>
          <article>
            <Globe size={23} aria-hidden="true" />
            <div>
              <span>{t('landing.trustSource1Tag')}</span>
              <h3>{t('landing.trustSource1Title')}</h3>
              <p>{t('landing.trustSource1Desc')}</p>
            </div>
          </article>
          <article>
            <Users size={23} aria-hidden="true" />
            <div>
              <span>{t('landing.trustSource2Tag')}</span>
              <h3>{t('landing.trustSource2Title')}</h3>
              <p>{t('landing.trustSource2Desc')}</p>
            </div>
          </article>
          <article>
            <ShieldCheck size={23} aria-hidden="true" />
            <div>
              <span>{t('landing.trustSource3Tag')}</span>
              <h3>{t('landing.trustSource3Title')}</h3>
              <p>{t('landing.trustSource3Desc')}</p>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.contribution} aria-labelledby="contribute-title">
        <div className={styles.contributeCopy}>
          <p className={styles.eyebrow}>{t('landing.contributeEyebrow')}</p>
          <h2 id="contribute-title">
            {t('landing.contributeTitle')}
          </h2>
          <p>{t('landing.contributeDesc')}</p>
          <Link href="/jelajah?screen=report" prefetch={false} className={styles.outlineLink}>
            {t('landing.contributeCta')} <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
          <small>
            {t('landing.contributeNote')}
          </small>
        </div>
        <ol className={styles.contributionFlow}>
          <li>
            <Camera aria-hidden="true" />
            <div>
              <strong>{t('landing.contributeStep1Title')}</strong>
              <span>{t('landing.contributeStep1Desc')}</span>
            </div>
          </li>
          <li>
            <ClipboardCheck aria-hidden="true" />
            <div>
              <strong>{t('landing.contributeStep2Title')}</strong>
              <span>{t('landing.contributeStep2Desc')}</span>
            </div>
          </li>
          <li>
            <Send aria-hidden="true" />
            <div>
              <strong>{t('landing.contributeStep3Title')}</strong>
              <span>{t('landing.contributeStep3Desc')}</span>
            </div>
          </li>
        </ol>
      </section>

      <section
        id="pertanyaan"
        className={`${styles.section} ${styles.faq}`}
        aria-labelledby="faq-title"
      >
        <div>
          <p className={styles.eyebrow}>{t('landing.faqEyebrow')}</p>
          <h2 id="faq-title">{t('landing.faqTitle')}</h2>
        </div>
        <div className={styles.questions}>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title">
        <div className={styles.ctaMotif} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className={styles.eyebrow}>{t('landing.finalEyebrow')}</p>
        <h2 id="final-title">
          {t('landing.finalTitle')}
        </h2>
        <Link href="/jelajah" prefetch={false} className={styles.primary}>
          {t('landing.exploreMap')} <ArrowRight size={19} aria-hidden="true" />
        </Link>
        <p className={styles.finalNote}>{t('landing.finalNote')}</p>
      </section>
    </main>
  );
}
