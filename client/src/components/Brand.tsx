import { Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/"
      className={`brand ${compact ? 'brand-compact' : ''}`}
      aria-label={`${t('common.brand')} — ${t('common.home')}`}
    >
      <span className="brand-icon">
        <Store size={24} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span>
        {t('common.brand')}
        <small>{t('common.brandNote')}</small>
      </span>
    </Link>
  );
}
