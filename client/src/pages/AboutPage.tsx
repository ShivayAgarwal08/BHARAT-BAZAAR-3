import { ChevronDown, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FinalCta, SectionHeading } from '../components/Sections';
import { IconTile } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import type { ContentItem } from '../types';

export function AboutPage() {
  const { t } = useTranslation();
  usePageTitle(t('common.about'));
  const journey = t('about.journey', { returnObjects: true }) as ContentItem[];
  const faqs = t('about.faqs', { returnObjects: true }) as ContentItem[];
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{t('about.eyebrow')}</p>
        <h1>{t('about.title')}</h1>
        <p>{t('about.description')}</p>
        <div className="small-craft-motif" aria-hidden="true">
          ✳
        </div>
      </section>
      <section className="container mission-section">
        <div className="mission-card">
          <IconTile icon={Handshake} tone="green" />
          <h2>{t('about.missionTitle')}</h2>
          <p>{t('about.missionText')}</p>
        </div>
      </section>
      <section className="section container">
        <SectionHeading eyebrow={t('common.about')} title={t('about.journeyTitle')} />
        <div className="journey-grid">
          {journey.map((item, index) => (
            <article className="journey-card" key={item.title}>
              <span className="journey-number">0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="faq-section section">
        <div className="container faq-grid">
          <SectionHeading eyebrow={t('common.learnMore')} title={t('about.faqTitle')} />
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.title}>
                <summary>
                  {faq.title}
                  <ChevronDown size={20} aria-hidden="true" />
                </summary>
                <p>{faq.description}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
