import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { homeFor } from '../services/auth-navigation';
import { ButtonLink } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
export function UnauthorizedPage() {
  const { t } = useTranslation(),
    { user } = useAuth();
  usePageTitle(t('p2.unauthorized'));
  return (
    <section className="container phase2-page narrow-page">
      <p className="eyebrow">403</p>
      <h1>{t('p2.unauthorized')}</h1>
      <p className="page-intro">{t('p2.unauthorizedText')}</p>
      <ButtonLink to={user ? homeFor(user) : '/login'}>
        {t(user ? 'common.backOverview' : 'common.login')}
      </ButtonLink>
    </section>
  );
}
