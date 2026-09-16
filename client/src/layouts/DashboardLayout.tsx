import { Bell, ChevronDown, ChevronRight, CircleHelp, Eye, LogOut, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { MobileDrawer } from '../components/MobileDrawer';
import { Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { dashboardSections } from '../routes/dashboard-config';
import type { Role } from '../types';

function DashboardNavigation({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <nav className="dashboard-nav" aria-label={t('dashboard.workspace')}>
      {dashboardSections[role].map(({ slug, label, icon: Icon }) => (
        <NavLink to={`/dashboard/${role}${slug ? `/${slug}` : ''}`} end key={label}>
          <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
          <span>{t(`dashboard.${label}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function DashboardLayout({ role }: { role: Role }) {
  const { user, leavePreview } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const base = `/dashboard/${role}`;
  const slug = location.pathname.replace(/\/$/, '').slice(base.length).replace(/^\//, '');
  const section = dashboardSections[role].find((item) => item.slug === slug);
  const title = section ? t(`dashboard.${section.label}`) : '404';
  usePageTitle(`${title} · ${t(`common.${role}`)}`);
  if (!user) return null;

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#main-content">
        {t('common.skip')}
      </a>
      <aside className="dashboard-sidebar">
        <Brand compact />
        <div className="workspace-label">
          <span>{t('dashboard.workspace')}</span>
          <strong>{t(`common.${role}`)}</strong>
        </div>
        <DashboardNavigation role={role} />
        <div className="sidebar-bottom">
          <Sprout size={23} strokeWidth={1.5} aria-hidden="true" />
          <strong>{t('dashboard.previewHelp')}</strong>
          <p>{t('dashboard.previewHelpText')}</p>
          <Link to="/about">
            {t('common.learnMore')}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="dashboard-body">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <MobileDrawer title={t(`common.${role}`)}>
              <DashboardNavigation role={role} />
            </MobileDrawer>
            <Link to="/" className="dashboard-mobile-brand">
              {t('common.brand')}
            </Link>
            <span className="desktop-workspace">{t('dashboard.workspace')}</span>
            <Badge tone="green">{t('common.preview')}</Badge>
          </div>
          <div className="dashboard-header-actions">
            <LanguageSwitcher />
            <details className="header-popover">
              <summary role="button" className="icon-button" aria-label={t('common.notifications')}>
                <Bell size={20} aria-hidden="true" />
              </summary>
              <div className="popover-panel notifications-panel">
                <Bell size={25} strokeWidth={1.4} aria-hidden="true" />
                <strong>{t('dashboard.noNotifications')}</strong>
                <p>{t('dashboard.noNotificationsText')}</p>
              </div>
            </details>
            <details className="header-popover">
              <summary role="button" className="user-trigger" aria-label={t('common.userMenu')}>
                <span className="avatar">{user.initials}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <div className="popover-panel user-panel">
                <small>{t('dashboard.profileLabel')}</small>
                <strong>{user.name}</strong>
                <p>{t(`common.${role}`)}</p>
                <button onClick={leavePreview}>
                  <LogOut size={17} aria-hidden="true" />
                  {t('common.signOut')}
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="dashboard-content" id="main-content" tabIndex={-1}>
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <Link to={base}>{t('dashboard.workspace')}</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span>{t(`common.${role}`)}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span aria-current="page">{title}</span>
          </nav>
          <div className="dashboard-title">
            <div>
              <p className="eyebrow">{slug ? t(`common.${role}`) : t('dashboard.welcome')}</p>
              <h1>{slug ? title : t('dashboard.hello', { name: user.name })}</h1>
              <p>{slug ? t('dashboard.featureNote') : t('dashboard.overviewText')}</p>
            </div>
            <span className="dashboard-title-icon">
              <Sprout size={31} strokeWidth={1.4} aria-hidden="true" />
            </span>
          </div>
          <div className="mock-banner">
            <Eye size={18} aria-hidden="true" />
            <p>{t('dashboard.mockNotice')}</p>
          </div>
          <Outlet />
          <div className="dashboard-footer-note">
            <CircleHelp size={16} aria-hidden="true" />
            <span>{t('dashboard.featureNote')}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
