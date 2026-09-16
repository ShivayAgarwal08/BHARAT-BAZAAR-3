import { useTranslation } from 'react-i18next';
import { ButtonLink, Card, EmptyState } from '../../components/ui';
import type { Role } from '../../types';

export function DashboardNotFound({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <Card>
      <EmptyState title={t('notFound.title')} description={t('notFound.text')}>
        <ButtonLink to={`/dashboard/${role}`}>{t('common.backOverview')}</ButtonLink>
      </EmptyState>
    </Card>
  );
}
