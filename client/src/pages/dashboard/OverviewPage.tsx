import { ArrowUpRight, Check, Handshake, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, ButtonLink, Card, IconTile, TextLink } from '../../components/ui';
import { activityIcons, overviewStats } from '../../routes/dashboard-config';
import type { ContentItem, Role } from '../../types';

export function OverviewPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  const activities = t(role === 'admin' ? 'dashboard.adminActivities' : 'dashboard.activities', {
    returnObjects: true,
  }) as ContentItem[];
  const partnerPath =
    role === 'artisan' ? 'my-manager' : role === 'student' ? 'current-artisan' : 'matching';
  const progressPath =
    role === 'artisan' ? 'milestones' : role === 'student' ? 'tasks' : 'matching';
  return (
    <>
      <div className="stats-grid">
        {overviewStats[role].map(({ key, value, icon: Icon }) => (
          <Card key={key} className="stat-card">
            <div className="stat-top">
              <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
              <span>{t('common.mockData')}</span>
            </div>
            <p>{t(`dashboard.stats.${key}`)}</p>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <div className="overview-grid">
        <Card className="focus-card">
          <div className="panel-heading">
            <h2>{t('dashboard.weeklyFocus')}</h2>
            <Badge>{t('common.mockData')}</Badge>
          </div>
          <div className="focus-visual" aria-hidden="true">
            <div className="catalogue-preview">
              <span className="catalogue-pot" />
              <div>
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="catalogue-check">
              <Check size={20} />
            </div>
            <span className="focus-spark">✳</span>
          </div>
          <h3>{t(role === 'admin' ? 'dashboard.focusAdmin' : 'dashboard.focusText')}</h3>
          <p>
            {t(role === 'admin' ? 'dashboard.focusAdminDescription' : 'dashboard.focusDescription')}
          </p>
          <div className="progress-label">
            <label htmlFor="sample-progress">{t('dashboard.progress')}</label>
            <span>60%</span>
          </div>
          <progress id="sample-progress" max="100" value="60">
            60%
          </progress>
          <TextLink to={`/dashboard/${role}/${progressPath}`}>{t('common.viewAll')}</TextLink>
        </Card>
        <Card className="activity-card">
          <div className="panel-heading">
            <h2>{t('dashboard.recentActivity')}</h2>
            <ArrowUpRight size={18} aria-hidden="true" />
          </div>
          <ol className="activity-list">
            {activities.map((activity, index) => (
              <li key={activity.title}>
                <IconTile
                  icon={activityIcons[index] || Handshake}
                  tone={index === 1 ? 'warm' : 'green'}
                />
                <div>
                  <span className="activity-label">
                    0{index + 1} · {t('dashboard.activityNote')}
                  </span>
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="activity-bottom">
            <Leaf size={18} aria-hidden="true" />
            {t('dashboard.welcome')}
          </div>
        </Card>
      </div>
      <div className="partnership-banner">
        <span className="partnership-banner-icon">
          <Handshake size={30} strokeWidth={1.3} aria-hidden="true" />
        </span>
        <div>
          <h2>{t('dashboard.partnerTitle')}</h2>
          <p>{t('dashboard.partnerText')}</p>
        </div>
        <ButtonLink to={`/dashboard/${role}/${partnerPath}`} variant="secondary" arrow>
          {t('dashboard.partnerCta')}
        </ButtonLink>
      </div>
    </>
  );
}
