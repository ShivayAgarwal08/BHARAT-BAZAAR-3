import { GraduationCap, HandHeart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CraftArtwork } from '../components/CraftArtwork';
import { BenefitList, FinalCta, SectionHeading } from '../components/Sections';
import { ButtonLink, IconTile } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export function AudiencePage({ audience }: { audience: 'artisan' | 'student' }) {
  const { t } = useTranslation();
  const prefix = `audience.${audience}`;
  usePageTitle(t(audience === 'artisan' ? 'common.artisans' : 'common.students'));
  const benefits = t(`landing.${audience}Benefits`, { returnObjects: true }) as string[];
  return (
    <>
      <section className={`audience-hero container ${audience === 'student' ? 'for-student' : ''}`}>
        <div>
          <p className="eyebrow">{t(`${prefix}.eyebrow`)}</p>
          <h1>{t(`${prefix}.title`)}</h1>
          <p className="hero-description">{t(`${prefix}.description`)}</p>
          <ButtonLink to={`/login?role=${audience}`} arrow>
            {t(`${prefix}.cta`)}
          </ButtonLink>
          <p className="disclaimer">{t('audience.previewNote')}</p>
        </div>
        <CraftArtwork compact />
      </section>
      <section className="section audience-detail">
        <div className="container audience-detail-grid">
          <div>
            <SectionHeading
              eyebrow={t(audience === 'artisan' ? 'common.artisans' : 'common.students')}
              title={t(`${prefix}.sectionTitle`)}
            />
            <div className="audience-benefit-items">
              {benefits.map((item, index) => (
                <div key={item}>
                  <span>0{index + 1}</span>
                  <h3>{item}</h3>
                </div>
              ))}
            </div>
          </div>
          <div className="expectations-card">
            <IconTile
              icon={audience === 'artisan' ? HandHeart : GraduationCap}
              tone={audience === 'artisan' ? 'warm' : 'indigo'}
            />
            <blockquote>{t(`${prefix}.quote`)}</blockquote>
            <h3>{t(`${prefix}.expectationsTitle`)}</h3>
            <BenefitList items={t(`${prefix}.expectations`, { returnObjects: true }) as string[]} />
          </div>
        </div>
      </section>
      <section className="section container text-center next-step">
        <h2>{t('audience.nextTitle')}</h2>
        <p>{t('audience.nextText')}</p>
        <ButtonLink to={`/login?role=${audience}`} variant="secondary" arrow>
          {t(`${prefix}.cta`)}
        </ButtonLink>
      </section>
      <FinalCta />
    </>
  );
}
