import { ArrowRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from './ui';

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={`section-heading ${centered ? 'text-center mx-auto' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

export function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="benefit-list">
      {items.map((item) => (
        <li key={item}>
          <Check size={17} strokeWidth={2} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="final-cta">
      <div className="container cta-inner">
        <div className="cta-flower" aria-hidden="true">
          ✳
        </div>
        <h2>{t('landing.ctaTitle')}</h2>
        <p>{t('landing.ctaText')}</p>
        <ButtonLink to="/register" variant="light">
          {t('landing.ctaButton')}
          <ArrowRight size={18} aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}
