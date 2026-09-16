import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useRemoteData } from '../../hooks/useRemoteData';
import { api } from '../../services/api';
import { Badge, Button, Card, EmptyState, Loading } from '../../components/ui';
import { ErrorNotice, FormField, Pagination } from '../../components/FormControls';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { AssistedRequest, AssistedStatus, PageResult, StudentRecord, User } from '../../types';

export function AdminStudentsPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('PENDING'),
    [page, setPage] = useState(1);
  const result = useRemoteData<PageResult<StudentRecord>>(
    '/admin/students?page=' + page + (status ? '&verificationStatus=' + status : ''),
  );
  return (
    <section>
      <FormField
        name="verificationFilter"
        kind="select"
        label={t('p2.filterVerification')}
        value={status}
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
      >
        <option value="">{t('p2.all')}</option>
        {['PENDING', 'VERIFIED', 'REJECTED'].map((value) => (
          <option key={value} value={value}>
            {t('p2.status.' + value)}
          </option>
        ))}
      </FormField>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <>
          <ErrorNotice error={result.error} />
          <Button onClick={result.reload}>{t('p2.retry')}</Button>
        </>
      ) : (
        <>
          {!result.data?.items.length && (
            <EmptyState title={t('p2.noRecords')} description={t('p2.noRecordsText')} />
          )}
          <div className="record-list">
            {result.data?.items.map(({ profile, user }) => (
              <Card className="record-card" key={profile.id}>
                <div>
                  <h2>{profile.fullName}</h2>
                  <p>{profile.college ?? t('p2.notProvided')}</p>
                  <p>{user.email ?? user.phone}</p>
                  <Badge>{t('p2.status.' + profile.verificationStatus)}</Badge>{' '}
                  {!profile.onboardingCompleted && <Badge tone="indigo">{t('p2.draft')}</Badge>}
                </div>
                <Link
                  className="button button-secondary"
                  to={'/dashboard/admin/students/' + profile.id}
                >
                  {t('p2.viewProfile')}
                </Link>
              </Card>
            ))}
          </div>
          {result.data && <Pagination {...result.data} onPage={setPage} />}
        </>
      )}
    </section>
  );
}

export function AdminStudentDetailPage() {
  const { t } = useTranslation(),
    { id } = useParams();
  const result = useRemoteData<StudentRecord>('/admin/students/' + id);
  const [mode, setMode] = useState<'verify' | 'reject' | null>(null),
    [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState(false);
  async function review() {
    if (!mode || !result.data) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post('/admin/students/' + id + '/' + mode, {
        notes,
        expectedUpdatedAt: result.data.profile.updatedAt,
      });
      setMode(null);
      setSuccess(true);
      result.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (result.loading) return <Loading />;
  if (result.error || !result.data)
    return (
      <>
        <ErrorNotice error={result.error} />
        <Button onClick={result.reload}>{t('p2.retry')}</Button>
      </>
    );
  const { profile, user, skills } = result.data;
  const fields = [
    'fullName',
    'college',
    'course',
    'studyYear',
    'city',
    'state',
    'languages',
    'biography',
    'weeklyAvailabilityHours',
    'expectedMonthlyRate',
    'portfolioUrl',
  ] as const;
  return (
    <section>
      <Link className="text-link" to="/dashboard/admin/students">
        {t('p2.backStudents')}
      </Link>
      {success && (
        <p className="success-note" role="status">
          {t('p2.statusSaved')}
        </p>
      )}
      <Card className="form-card">
        <h2>{profile.fullName}</h2>
        <Badge>{t('p2.status.' + profile.verificationStatus)}</Badge>
        <dl className="profile-details">
          {fields.map((key) => (
            <div key={key}>
              <dt>{t('p2.fields.' + key)}</dt>
              <dd>
                {Array.isArray(profile[key])
                  ? profile[key].join(', ')
                  : (profile[key] ?? t('p2.notProvided'))}
              </dd>
            </div>
          ))}
          <div>
            <dt>{t('p2.fields.email')}</dt>
            <dd>{user.email ?? t('p2.notProvided')}</dd>
          </div>
          <div>
            <dt>{t('p2.fields.phone')}</dt>
            <dd>{user.phone ?? t('p2.notProvided')}</dd>
          </div>
          <div>
            <dt>{t('p2.fields.preferredLanguage')}</dt>
            <dd>{user.preferredLanguage === 'HI' ? 'हिन्दी' : 'English'}</dd>
          </div>
          <div>
            <dt>{t('p2.accountStatus')}</dt>
            <dd>{t('p2.status.' + user.accountStatus)}</dd>
          </div>
          <div>
            <dt>{t('p2.verificationNotes')}</dt>
            <dd>{profile.verificationNotes ?? t('p2.notProvided')}</dd>
          </div>
          <div>
            <dt>{t('p2.onboardingStatus')}</dt>
            <dd>{t(profile.onboardingCompleted ? 'p2.onboardingComplete' : 'p2.draft')}</dd>
          </div>
        </dl>
        <h3>{t('p2.selectSkills')}</h3>
        <ul className="skill-summary">
          {skills?.map((skill) => (
            <li key={skill.skillId}>
              {t('p2.skills.' + skill.slug, { defaultValue: skill.name })} ·{' '}
              {t('p2.level.' + skill.proficiencyLevel)}
            </li>
          ))}
        </ul>
        {!profile.onboardingCompleted && <p className="notice">{t('p2.completeBeforeReview')}</p>}
        <div className="form-actions">
          <Button
            disabled={!profile.onboardingCompleted || user.accountStatus === 'SUSPENDED'}
            onClick={() => {
              setMode('verify');
              setNotes('');
              setError(null);
            }}
          >
            {t('p2.verifyStudent')}
          </Button>
          <Button
            variant="secondary"
            disabled={!profile.onboardingCompleted || user.accountStatus === 'SUSPENDED'}
            onClick={() => {
              setMode('reject');
              setNotes('');
              setError(null);
            }}
          >
            {t('p2.rejectStudent')}
          </Button>
        </div>
      </Card>
      {mode && (
        <ConfirmDialog
          title={t(mode === 'verify' ? 'p2.verifyStudent' : 'p2.rejectStudent')}
          busy={busy}
          error={error}
          onConfirm={() => void review()}
          onCancel={() => setMode(null)}
        >
          <p>{profile.fullName}</p>
          <FormField
            kind="textarea"
            name="reviewNotes"
            label={t('p2.verificationNotes')}
            required={mode === 'reject'}
            minLength={mode === 'reject' ? 3 : undefined}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            hint={t(mode === 'reject' ? 'p2.rejectionHint' : 'p2.optional')}
          />
        </ConfirmDialog>
      )}
    </section>
  );
}

export function AdminAssistancePage() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState('PENDING'),
    [page, setPage] = useState(1);
  const result = useRemoteData<PageResult<AssistedRequest>>(
    '/admin/assisted-registrations?page=' + page + (status ? '&status=' + status : ''),
  );
  const [change, setChange] = useState<{ request: AssistedRequest; status: AssistedStatus } | null>(
    null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState(false);
  async function update() {
    if (!change) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch('/admin/assisted-registrations/' + change.request.id, {
        status: change.status,
        expectedUpdatedAt: change.request.updatedAt,
      });
      setChange(null);
      setSuccess(true);
      result.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  const statuses: AssistedStatus[] = ['PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED'];
  return (
    <section>
      <p className="page-intro">{t('p2.assistanceAdminIntro')}</p>
      {success && (
        <p className="success-note" role="status">
          {t('p2.statusSaved')}
        </p>
      )}
      <FormField
        kind="select"
        name="assistanceFilter"
        label={t('p2.filterStatus')}
        value={status}
        onChange={(event) => {
          setStatus(event.target.value);
          setPage(1);
        }}
      >
        <option value="">{t('p2.all')}</option>
        {statuses.map((value) => (
          <option value={value} key={value}>
            {t('p2.status.' + value)}
          </option>
        ))}
      </FormField>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <>
          <ErrorNotice error={result.error} />
          <Button onClick={result.reload}>{t('p2.retry')}</Button>
        </>
      ) : (
        <>
          {!result.data?.items.length && (
            <EmptyState title={t('p2.noRecords')} description={t('p2.noRecordsText')} />
          )}
          <div className="record-list">
            {result.data?.items.map((request) => (
              <Card className="form-card" key={request.id}>
                <h2>{request.name}</h2>
                <Badge>{t('p2.status.' + request.status)}</Badge>
                <dl className="profile-details">
                  <div>
                    <dt>{t('p2.fields.phone')}</dt>
                    <dd>
                      <a className="text-link" href={'tel:' + request.phone}>
                        {request.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>{t('p2.fields.preferredCallTime')}</dt>
                    <dd>{request.preferredCallTime}</dd>
                  </div>
                  <div>
                    <dt>{t('p2.fields.city')}</dt>
                    <dd>
                      {request.city}, {request.state}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('p2.fields.preferredLanguage')}</dt>
                    <dd>{request.preferredLanguage === 'HI' ? 'हिन्दी' : 'English'}</dd>
                  </div>
                  <div>
                    <dt>{t('p2.fields.notes')}</dt>
                    <dd>{request.notes || t('p2.notProvided')}</dd>
                  </div>
                  <div>
                    <dt>{t('p2.createdAt')}</dt>
                    <dd>
                      {new Date(request.createdAt).toLocaleString(
                        i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN',
                      )}
                    </dd>
                  </div>
                </dl>
                <FormField
                  kind="select"
                  name={'status-' + request.id}
                  label={t('p2.changeStatusFor', { name: request.name })}
                  value={request.status}
                  onChange={(event) => {
                    setError(null);
                    setChange({ request, status: event.target.value as AssistedStatus });
                  }}
                >
                  {statuses.map((value) => (
                    <option value={value} key={value}>
                      {t('p2.status.' + value)}
                    </option>
                  ))}
                </FormField>
              </Card>
            ))}
          </div>
          {result.data && <Pagination {...result.data} onPage={setPage} />}
        </>
      )}
      {change && (
        <ConfirmDialog
          title={t('p2.changeStatus')}
          busy={busy}
          error={error}
          onConfirm={() => void update()}
          onCancel={() => setChange(null)}
        >
          <p>
            {change.request.name}: {t('p2.status.' + change.status)}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
export function AdminUsersPage({ artisansOnly = false }: { artisansOnly?: boolean }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const result = useRemoteData<PageResult<User>>(
    '/admin/users?page=' + page + (artisansOnly ? '&role=ARTISAN' : ''),
  );
  return (
    <section>
      <div className="overview-actions">
        <Link className="text-link" to="/dashboard/admin/users">
          {t('p2.allUsers')}
        </Link>
      </div>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <>
          <ErrorNotice error={result.error} />
          <Button onClick={result.reload}>{t('p2.retry')}</Button>
        </>
      ) : (
        <>
          {!result.data?.items.length && (
            <EmptyState title={t('p2.noRecords')} description={t('p2.noRecordsText')} />
          )}
          <div className="record-list">
            {result.data?.items.map((user) => (
              <Card className="record-card" key={user.id}>
                <div>
                  <h2>{user.email ?? user.phone}</h2>
                  <p>{user.phone}</p>
                  <p>{t('common.' + user.role.toLowerCase())}</p>
                  <Badge>{t('p2.status.' + user.accountStatus)}</Badge>
                </div>
              </Card>
            ))}
          </div>
          {result.data && <Pagination {...result.data} onPage={setPage} />}
        </>
      )}
    </section>
  );
}
