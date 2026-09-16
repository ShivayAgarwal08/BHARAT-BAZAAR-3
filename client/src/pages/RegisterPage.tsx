import { ArrowRight, GraduationCap, HandHeart, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IconTile } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

export function RegisterPage() {
  const { t } = useTranslation();
  usePageTitle(t('common.getStarted'));
  return (
    <section className="register-section container">
      <div className="page-hero">
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h1>{t('auth.registerTitle')}</h1>
        <p>{t('auth.registerText')}</p>
      </div>
      <div className="registration-cards">
        {(['artisan', 'student'] as const).map((role) => (
          <Link to={`/register/${role}`} key={role} className={`registration-card ${role}-card`}>
            <IconTile
              icon={role === 'artisan' ? HandHeart : GraduationCap}
              tone={role === 'artisan' ? 'warm' : 'indigo'}
            />
            <h2>{t(`landing.${role}Cta`)}</h2>
            <p>{t(`auth.${role}Text`)}</p>
            <span className="text-link">
              {t('common.continue')}
              <ArrowRight size={19} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
      <p className="registration-notice">
        <Info size={18} aria-hidden="true" />
        {t('p2.registrationNote')}
      </p>
      <Link className="help-link" to="/help-register">
        {t('p2.helpRegister')}
      </Link>
      <p className="auth-bottom">
        {t('auth.existing')} <Link to="/login">{t('common.login')}</Link>
      </p>
    </section>
  );
}
