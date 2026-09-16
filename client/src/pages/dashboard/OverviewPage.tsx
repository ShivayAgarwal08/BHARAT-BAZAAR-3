import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useRemoteData } from '../../hooks/useRemoteData';
import { Badge, Button, ButtonLink, Card, Loading } from '../../components/ui';
import { ErrorNotice } from '../../components/FormControls';
import type { AdminCounts, Profile, Role } from '../../types';

function AdminOverview() {
  const { t } = useTranslation();
  const { data, error, loading, reload } = useRemoteData<AdminCounts>('/admin/overview');
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <ErrorNotice error={error} />
        <Button onClick={reload}>{t('p2.retry')}</Button>
      </>
    );
  return (
    <>
      <div className="stats-grid">
        {Object.entries(data ?? {}).map(([key, value]) => (
          <Card className="stat-card" key={key}>
            <p>{t('p2.counts.' + key)}</p>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <div className="overview-actions">
        <ButtonLink to="/dashboard/admin/students">{t('p2.reviewStudents')}</ButtonLink>
        <ButtonLink variant="secondary" to="/dashboard/admin/assisted-registrations">
          {t('p2.manageAssistance')}
        </ButtonLink>
      </div>
    </>
  );
}
function MemberOverview({ role }: { role: 'artisan' | 'student' }) {
  const { t } = useTranslation(),
    { user } = useAuth();
  const { data, error, loading, reload } = useRemoteData<Profile>('/' + role + 's/me');
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <ErrorNotice error={error} />
        <Button onClick={reload}>{t('p2.retry')}</Button>
      </>
    );
  return (
    <div className="overview-grid">
      <Card className="form-card">
        <p className="eyebrow">{t('p2.yourProfile')}</p>
        <h2>{data?.fullName}</h2>
        <Badge tone="green">
          {t(data?.onboardingCompleted ? 'p2.onboardingComplete' : 'p2.draft')}
        </Badge>
        <p className="page-intro">{role === 'artisan' ? data?.businessName : data?.college}</p>
        <p>
          {data?.city}, {data?.state}
        </p>
        <p>{data?.languages.join(', ')}</p>
        <ButtonLink to={'/dashboard/' + role + '/profile'} variant="secondary">
          {t('p2.editProfile')}
        </ButtonLink>
      </Card>
      <Card className="form-card">
        <h2>{t(role === 'student' ? 'p2.verification' : 'p2.nextChapter')}</h2>
        {role === 'student' && (
          <Badge>{t('p2.status.' + (data?.verificationStatus ?? 'PENDING'))}</Badge>
        )}
        <p className="page-intro">
          {t(
            role === 'student'
              ? data?.verificationStatus === 'VERIFIED'
                ? 'p2.verifiedText'
                : data?.verificationStatus === 'REJECTED'
                  ? 'p2.rejectedText'
                  : 'p2.pendingText'
              : 'p2.laterWorkflows',
          )}
        </p>
        {data?.verificationNotes && (
          <blockquote className="review-notes">{data.verificationNotes}</blockquote>
        )}
        {user && (
          <p className="field-hint">
            {t('p2.accountStatus')}: {t('p2.status.' + user.accountStatus)}
          </p>
        )}
      </Card>
    </div>
  );
}
export function OverviewPage({ role }: { role: Role }) {
  return role === 'admin' ? <AdminOverview /> : <MemberOverview role={role} />;
}
