import { MoveLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle('404');
  return (
    <section className="not-found container">
      <div className="woven-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">{t('notFound.eyebrow')}</p>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.text')}</p>
      <ButtonLink to="/">
        <MoveLeft size={18} aria-hidden="true" />
        {t('common.backHome')}
      </ButtonLink>
    </section>
  );
}
