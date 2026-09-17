import { Bell, ChevronDown, ChevronRight, CircleHelp, LogOut, Sprout } from 'lucide-react';
import { useState } from 'react';
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
import { ErrorNotice } from '../components/FormControls';

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
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const base = `/dashboard/${role}`;
  const slug = location.pathname.replace(/\/$/, '').slice(base.length).replace(/^\//, '');
  const section = dashboardSections[role].find(
    (item) => item.slug === slug || (item.slug && slug.startsWith(item.slug + '/')),
  );
  // History/detail routes remain accessible without adding operational sidebar tabs.
  const artisanHistoryTitle =
    role === 'artisan' && /^growth-requests(?:\/[^/]+)?$/.test(slug)
      ? t('focus.viewPilotHistory')
      : role === 'artisan' && /^contract\/[^/]+$/.test(slug)
        ? t('p3.viewContract')
        : null;
  const title =
    artisanHistoryTitle ??
    (slug === 'users' ? t('p2.allUsers') : section ? t(`dashboard.${section.label}`) : '404');
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
          <strong>{t('p2.nextChapter')}</strong>
          <p>{t('p2.sessionNotice')}</p>
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
            <Badge tone="green">{t('p2.phaseLabel')}</Badge>
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
                <span className="avatar">
                  {user.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <div className="popover-panel user-panel">
                <small>{t('p2.yourProfile')}</small>
                <strong>{user.fullName}</strong>
                <p>{t(`common.${role}`)}</p>
                <button
                  disabled={loggingOut}
                  onClick={() => {
                    setLoggingOut(true);
                    setLogoutError(null);
                    void logout()
                      .catch((error: unknown) => setLogoutError(error))
                      .finally(() => setLoggingOut(false));
                  }}
                >
                  <LogOut size={17} aria-hidden="true" />
                  {t(loggingOut ? 'common.loading' : 'p2.logout')}
                </button>
                <p className="field-hint">{t('p2.logoutHint')}</p>
              </div>
            </details>
          </div>
        </header>
        <main className="dashboard-content" id="main-content" tabIndex={-1}>
          <nav aria-label={t('p2.breadcrumb')} className="breadcrumbs">
            <Link to={base}>{t('dashboard.workspace')}</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span>{t(`common.${role}`)}</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span aria-current="page">{title}</span>
          </nav>
          <div className="dashboard-title">
            <div>
              <p className="eyebrow">{slug ? t(`common.${role}`) : t('dashboard.welcome')}</p>
              <h1>{slug ? title : t('dashboard.hello', { name: user.fullName })}</h1>
              <p>{t('p2.workspaceIntro')}</p>
            </div>
            <span className="dashboard-title-icon">
              <Sprout size={31} strokeWidth={1.4} aria-hidden="true" />
            </span>
          </div>
          <ErrorNotice error={logoutError} />
          <Outlet />
          <div className="dashboard-footer-note">
            <CircleHelp size={16} aria-hidden="true" />
            <span>{t('p2.sessionNotice')}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
