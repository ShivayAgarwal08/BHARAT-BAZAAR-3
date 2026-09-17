import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ButtonLink, Card, EmptyState, Loading, Badge } from '../../components/ui';
import { ErrorNotice } from '../../components/FormControls';
import { useAuth } from '../../hooks/useAuth';
import { useRemoteData } from '../../hooks/useRemoteData';
import { ArtisanGrowthRequestsPage } from './TrialPages';
import type { BusinessMetric, CurrentEngagement } from '../../types';

function dateRange(start?: string, end?: string) {
  if (!start || !end) return null;
  return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}`;
}

function EngagementType({
  engagement,
  role,
}: {
  engagement: CurrentEngagement;
  role: 'artisan' | 'student';
}) {
  const { t } = useTranslation();
  const sponsored = engagement.assignment.type === 'FREE_TRIAL';
  return (
    <div className="engagement-payment-context">
      <Badge tone={sponsored ? 'green' : 'indigo'}>
        {t(sponsored ? 'focus.platformSponsored' : 'focus.artisanPaid')}
      </Badge>
      {sponsored ? (
        <p>{t(role === 'artisan' ? 'focus.artisanCostZero' : 'focus.studentStipendSponsored')}</p>
      ) : (
        <p>
          {t(role === 'artisan' ? 'focus.externalPayment' : 'focus.studentExternalPayment', {
            amount: engagement.contract?.artisanPaymentAmount ?? '—',
          })}
        </p>
      )}
    </div>
  );
}

function EngagementTasks({ engagement }: { engagement: CurrentEngagement }) {
  const { t } = useTranslation();
  const tasks = engagement.milestones.flatMap((milestone) => milestone.tasks);
  if (!tasks.length) return <p className="field-hint">{t('focus.noWorkYet')}</p>;
  return (
    <ul className="check-list">
      {tasks.map((task) => (
        <li key={task.id}>
          <Badge tone={task.status === 'APPROVED' ? 'green' : 'warm'}>
            {task.status.replaceAll('_', ' ')}
          </Badge>
          <span>{task.title}</span>
        </li>
      ))}
    </ul>
  );
}

function MetricValue({
  value,
  currency = false,
}: {
  value: string | number | null;
  currency?: boolean;
}) {
  if (value === null) return <>—</>;
  return <>{currency ? `₹${value}` : value}</>;
}

function GrowthMetrics({ metrics }: { metrics: BusinessMetric[] }) {
  const { t } = useTranslation();
  const baseline = metrics.find((metric) => metric.type === 'BASELINE');
  const current =
    metrics.find((metric) => metric.type === 'PROGRESS') ??
    metrics.find((metric) => metric.type === 'FINAL');
  if (!baseline && !current)
    return <EmptyState title={t('focus.noGrowthData')} description={t('focus.noGrowthDataText')} />;
  const rows: Array<{
    label: string;
    before: string | number | null;
    now: string | number | null;
    currency?: boolean;
  }> = [
    {
      label: t('focus.monthlyRevenue'),
      before: baseline?.monthlyRevenue ?? null,
      now: current?.monthlyRevenue ?? null,
      currency: true,
    },
    {
      label: t('focus.onlineOrders'),
      before: baseline?.onlineOrders ?? null,
      now: current?.onlineOrders ?? null,
    },
    {
      label: t('focus.socialFollowers'),
      before: baseline?.socialFollowers ?? null,
      now: current?.socialFollowers ?? null,
    },
  ];
  return (
    <div className="engagement-metrics">
      {rows.map((row) => (
        <Card key={row.label} className="metric-card">
          <p>{row.label}</p>
          <strong>
            <MetricValue value={row.now} currency={row.currency} />
          </strong>
          <span>
            {t('focus.before')}: <MetricValue value={row.before} currency={row.currency} />
          </span>
        </Card>
      ))}
    </div>
  );
}

function useCurrentEngagement(role: 'artisan' | 'student') {
  return useRemoteData<CurrentEngagement | null>(`/${role}s/me/current-engagement`);
}

function MemberHome({ role }: { role: 'artisan' | 'student' }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, error, loading } = useCurrentEngagement(role);
  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;
  const other = role === 'artisan' ? data?.student : data?.artisan;
  if (!data || !other) {
    return (
      <EmptyState
        title={t(role === 'artisan' ? 'focus.noArtisanEngagement' : 'focus.noStudentEngagement')}
        description={t(
          role === 'artisan' ? 'focus.noArtisanEngagementText' : 'focus.noStudentEngagementText',
        )}
      >
        {role === 'artisan' ? (
          <ButtonLink to="/dashboard/artisan/my-growth/new">{t('focus.requestHelp')}</ButtonLink>
        ) : (
          <ButtonLink to="/dashboard/student/opportunities">
            {t('focus.viewOpportunities')}
          </ButtonLink>
        )}
      </EmptyState>
    );
  }
  const managerRoute = role === 'artisan' ? 'my-manager' : 'my-artisan';
  return (
    <div className="overview-grid">
      <Card className="form-card">
        <p className="eyebrow">{t('focus.currentEngagement')}</p>
        <h2>{other.fullName}</h2>
        <p className="page-intro">
          {role === 'artisan'
            ? [other.college, other.course].filter(Boolean).join(' · ')
            : [other.businessName, other.craftCategory].filter(Boolean).join(' · ')}
        </p>
        <EngagementType engagement={data} role={role} />
        <p>
          {data.contract
            ? dateRange(data.contract.startDate, data.contract.endDate)
            : t('focus.discoveryInProgress')}
        </p>
        <ButtonLink to={`/dashboard/${role}/${managerRoute}`}>
          {t(role === 'artisan' ? 'focus.viewManager' : 'focus.viewArtisan')}
        </ButtonLink>
      </Card>
      <Card className="form-card">
        <p className="eyebrow">{t('focus.nextAction')}</p>
        <h2>{data.request?.title ?? t('focus.yourGrowthPlan')}</h2>
        <p>{data.discovery?.recommendedServices ?? t('focus.discoveryInProgress')}</p>
        <p className="field-hint">{t('focus.welcome', { name: user?.fullName ?? '' })}</p>
        <ButtonLink
          variant="secondary"
          to={`/dashboard/${role}/${role === 'artisan' ? 'my-growth' : managerRoute}`}
        >
          {t('focus.viewProgress')}
        </ButtonLink>
      </Card>
    </div>
  );
}

function EngagementDetail({ role }: { role: 'artisan' | 'student' }) {
  const { t } = useTranslation();
  const { data, error, loading } = useCurrentEngagement(role);
  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;
  if (!data)
    return <EmptyState title={t('focus.noEngagement')} description={t('focus.noEngagementText')} />;
  const counterpart = role === 'artisan' ? data.student : data.artisan;
  return (
    <div className="record-list">
      <Card className="form-card">
        <p className="eyebrow">{t(role === 'artisan' ? 'focus.myManager' : 'focus.myArtisan')}</p>
        <h2>{counterpart.fullName}</h2>
        <p>
          {role === 'artisan'
            ? [counterpart.college, counterpart.course].filter(Boolean).join(' · ')
            : [counterpart.businessName, counterpart.craftCategory, counterpart.city]
                .filter(Boolean)
                .join(' · ')}
        </p>
        <EngagementType engagement={data} role={role} />
        {data.contract && (
          <p>
            {t('focus.engagementDates')}:{' '}
            {dateRange(data.contract.startDate, data.contract.endDate)}
          </p>
        )}
      </Card>
      <Card className="form-card">
        <h2>{t('focus.whatWeAreWorkingOn')}</h2>
        <p>
          {data.discovery?.recommendedServices ??
            data.request?.problemDescription ??
            t('focus.discoveryInProgress')}
        </p>
        {data.contract && (
          <>
            <h3>{t('focus.deliverables')}</h3>
            <p>{data.contract.deliverables}</p>
          </>
        )}
        <EngagementTasks engagement={data} />
      </Card>
      {data.contract?.contractType === 'PAID' && (
        <Card className="form-card">
          <h2>{t('focus.paymentContext')}</h2>
          <p>{t('focus.paidDirectly')}</p>
          <ButtonLink to={`/dashboard/${role}/payments`} variant="secondary">
            {t('focus.paymentRecords')}
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}

export function ArtisanHomePage() {
  return <MemberHome role="artisan" />;
}
export function StudentHomePage() {
  return <MemberHome role="student" />;
}
export function MyManagerPage() {
  return <EngagementDetail role="artisan" />;
}
export function MyArtisanPage() {
  return <EngagementDetail role="student" />;
}

function MyGrowthContent() {
  const { t } = useTranslation();
  const { data, error, loading } = useCurrentEngagement('artisan');
  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;
  if (!data)
    return (
      <EmptyState title={t('focus.noGrowthPlan')} description={t('focus.noGrowthPlanText')}>
        <ButtonLink to="new">{t('focus.requestHelp')}</ButtonLink>
      </EmptyState>
    );
  return (
    <section className="record-list">
      <Card className="form-card">
        <h2>{t('focus.myGrowth')}</h2>
        <p className="page-intro">{t('focus.changeDuringEngagement')}</p>
        <GrowthMetrics metrics={data.metrics} />
      </Card>
      <Card className="form-card">
        <h2>{t('focus.completedWork')}</h2>
        <EngagementTasks engagement={data} />
        <ButtonLink to="/dashboard/artisan/my-growth?history=1" variant="secondary">
          {t('focus.viewPilotHistory')}
        </ButtonLink>
      </Card>
    </section>
  );
}

export function MyGrowthPage() {
  const [searchParams] = useSearchParams();
  return searchParams.get('history') === '1' ? <ArtisanGrowthRequestsPage /> : <MyGrowthContent />;
}
