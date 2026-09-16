import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, ButtonLink, Card, EmptyState } from '../../components/ui';
import type { DashboardSection } from '../../routes/dashboard-config';
import type { Role } from '../../types';

export function PlaceholderPage({ role, section }: { role: Role; section: DashboardSection }) {
  const { t } = useTranslation();
  return (
    <>
      <Card className="feature-placeholder">
        <Badge tone="green">{t('common.comingSoon')}</Badge>
        <EmptyState
          icon={section.icon}
          title={t('dashboard.noFeatureTitle')}
          description={t('dashboard.noFeatureText', { feature: t(`dashboard.${section.label}`) })}
        >
          {section.slug === 'payments' && (
            <p className="payment-note">{t('dashboard.paymentNote')}</p>
          )}
          <ButtonLink to={`/dashboard/${role}`} variant="secondary">
            {t('common.backOverview')}
          </ButtonLink>
        </EmptyState>
      </Card>
      <div className="scope-note">
        <Info size={20} aria-hidden="true" />
        <div>
          <h2>{t('dashboard.scopeTitle')}</h2>
          <p>{t('dashboard.scopeText')}</p>
        </div>
      </div>
    </>
  );
}
