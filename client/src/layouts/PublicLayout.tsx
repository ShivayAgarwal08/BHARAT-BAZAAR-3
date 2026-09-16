import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { MobileDrawer } from '../components/MobileDrawer';
import { ButtonLink } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { homeFor } from '../services/auth-navigation';

const publicLinks = [
  { to: '/about', label: 'about' },
  { to: '/artisans', label: 'artisans' },
  { to: '/students', label: 'students' },
];

export function PublicLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  return (
    <div className="public-layout">
      <a className="skip-link" href="#main-content">
        {t('common.skip')}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label={t('footer.explore')}>
            {publicLinks.map(({ to, label }) => (
              <NavLink key={to} to={to}>
                {t(`common.${label}`)}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <LanguageSwitcher />
            <Link to={user ? homeFor(user) : '/login'} className="login-link">
              {t(user ? 'dashboard.workspace' : 'common.login')}
            </Link>
            <ButtonLink to="/register" className="header-cta">
              {t('common.getStarted')}
              <ArrowUpRight size={17} aria-hidden="true" />
            </ButtonLink>
            <MobileDrawer title={t('common.brand')}>
              <nav className="drawer-nav" aria-label={t('footer.explore')}>
                {publicLinks.map(({ to, label }) => (
                  <NavLink key={to} to={to}>
                    {t(`common.${label}`)}
                  </NavLink>
                ))}
                <Link to={user ? homeFor(user) : '/login'}>
                  {t(user ? 'dashboard.workspace' : 'common.login')}
                </Link>
                <Link to="/help-register">{t('p2.helpRegister')}</Link>
                <ButtonLink to="/register">{t('common.getStarted')}</ButtonLink>
              </nav>
            </MobileDrawer>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <Brand />
              <p>{t('footer.text')}</p>
            </div>
            <div>
              <h2>{t('footer.explore')}</h2>
              <nav aria-label={t('footer.explore')}>
                {publicLinks.map(({ to, label }) => (
                  <Link key={to} to={to}>
                    {t(`common.${label}`)}
                  </Link>
                ))}
              </nav>
            </div>
            <div>
              <h2>{t('footer.join')}</h2>
              <nav aria-label={t('footer.join')}>
                <Link to="/help-register">{t('p2.helpRegister')}</Link>
                <Link to="/register">{t('common.getStarted')}</Link>
                <Link to="/login">{t('common.login')}</Link>
              </nav>
              <span className="footer-preview">
                <span />
                {t('footer.preview')}
              </span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>{t('footer.copyright')}</span>
            <span>{t('footer.note')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
