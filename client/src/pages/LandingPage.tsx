import {
  ArrowRight,
  BookOpen,
  Camera,
  ClipboardList,
  GraduationCap,
  HandHeart,
  Handshake,
  Languages,
  Leaf,
  ListChecks,
  MessagesSquare,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CraftArtwork } from '../components/CraftArtwork';
import { BenefitList, FinalCta, SectionHeading } from '../components/Sections';
import { ButtonLink, IconTile, TextLink } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import type { ContentItem } from '../types';

const serviceIcons = [Camera, BookOpen, ShoppingBag, MessagesSquare, Truck, ClipboardList];
const trustIcons = [ShieldCheck, Handshake, ListChecks, HandHeart];

export function LandingPage() {
  const { t } = useTranslation();
  usePageTitle(t('common.home'));
  const steps = t('landing.steps', { returnObjects: true }) as ContentItem[];
  const services = t('landing.services', { returnObjects: true }) as ContentItem[];
  const trustFeatures = t('landing.trustFeatures', { returnObjects: true }) as ContentItem[];
  const trustStrip = t('landing.trustStrip', { returnObjects: true }) as string[];
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            {t('landing.eyebrow')}
          </p>
          <h1>
            <span>{t('landing.titleOne')}</span>
            <span>{t('landing.titleTwo')}</span>
            <span className="hero-accent">
              {t('landing.titleThree')}
              <svg viewBox="0 0 370 14" aria-hidden="true">
                <path
                  d="M4 10C100 2 229 1 364 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="hero-description">{t('landing.subtitle')}</p>
          <div className="hero-actions">
            <ButtonLink to="/artisans" arrow>
              {t('landing.artisanCta')}
            </ButtonLink>
            <ButtonLink to="/students" variant="secondary" arrow>
              {t('landing.studentCta')}
            </ButtonLink>
          </div>
          <p className="hero-note">
            <Leaf size={17} aria-hidden="true" />
            {t('landing.heroNote')}
          </p>
        </div>
        <CraftArtwork />
      </section>
      <div className="trust-strip">
        <div className="container trust-strip-inner">
          {trustStrip.map((label, index) => {
            const Icon = [Handshake, ShieldCheck, Languages][index] || Handshake;
            return (
              <span key={label}>
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                {label}
              </span>
            );
          })}
        </div>
      </div>
      <section className="section container">
        <div className="section-topline">
          <SectionHeading
            eyebrow={t('landing.howEyebrow')}
            title={t('landing.howTitle')}
            description={t('landing.howDescription')}
          />
          <TextLink to="/about">{t('common.about')}</TextLink>
        </div>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article className="step-card" key={step.title}>
              <div className="step-marker">
                <span>0{index + 1}</span>
                <div />
                <ArrowRight size={18} aria-hidden="true" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="benefits-section section">
        <div className="container">
          <SectionHeading
            eyebrow={t('landing.benefitEyebrow')}
            title={t('landing.benefitTitle')}
            centered
          />
          <div className="benefits-grid">
            <article className="audience-card artisan-card">
              <div className="audience-card-label">
                <IconTile icon={HandHeart} />
                <span>{t('common.artisans')}</span>
                <span className="mini-motif" aria-hidden="true">
                  ✳
                </span>
              </div>
              <h3>{t('landing.artisanTitle')}</h3>
              <p>{t('landing.artisanText')}</p>
              <BenefitList
                items={t('landing.artisanBenefits', { returnObjects: true }) as string[]}
              />
              <TextLink to="/artisans">{t('common.artisans')}</TextLink>
            </article>
            <article className="audience-card student-card">
              <div className="audience-card-label">
                <IconTile icon={GraduationCap} tone="indigo" />
                <span>{t('common.students')}</span>
                <Sparkles size={38} strokeWidth={1} className="mini-motif" aria-hidden="true" />
              </div>
              <h3>{t('landing.studentTitle')}</h3>
              <p>{t('landing.studentText')}</p>
              <BenefitList
                items={t('landing.studentBenefits', { returnObjects: true }) as string[]}
              />
              <TextLink to="/students">{t('common.students')}</TextLink>
            </article>
          </div>
        </div>
      </section>
      <section className="section container">
        <SectionHeading eyebrow={t('landing.servicesEyebrow')} title={t('landing.servicesTitle')} />
        <div className="services-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.title}>
              <IconTile
                icon={serviceIcons[index] || Package}
                tone={index % 2 ? 'indigo' : 'warm'}
              />
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="story-section">
        <div className="container story-grid">
          <div className="story-visual">
            <CraftArtwork compact />
            <span className="story-visual-label">{t('landing.storyLabel')}</span>
          </div>
          <div className="story-copy">
            <SectionHeading
              eyebrow={t('landing.storyEyebrow')}
              title={t('landing.storyTitle')}
              description={t('landing.storyText')}
            />
            <div className="story-change">
              <div>
                <span className="story-stage">{t('landing.storyBefore')}</span>
                <p>{t('landing.storyBeforeText')}</p>
              </div>
              <div>
                <span className="story-stage after">
                  <Sparkles size={15} aria-hidden="true" />
                  {t('landing.storyAfter')}
                </span>
                <p>{t('landing.storyAfterText')}</p>
              </div>
            </div>
            <p className="disclaimer">{t('landing.storyDisclaimer')}</p>
          </div>
        </div>
      </section>
      <section className="section container trust-grid">
        <div>
          <SectionHeading
            eyebrow={t('landing.trustEyebrow')}
            title={t('landing.trustTitle')}
            description={t('landing.trustText')}
          />
          <p className="disclaimer trust-disclaimer">{t('landing.trustNote')}</p>
        </div>
        <div className="trust-features">
          {trustFeatures.map((feature, index) => (
            <article key={feature.title}>
              <IconTile icon={trustIcons[index] || ShieldCheck} tone="green" />
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <FinalCta />
    </>
  );
}
