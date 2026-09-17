import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRemoteData } from '../../hooks/useRemoteData';
import { api } from '../../services/api';
import { Button, ButtonLink, Card, EmptyState, Loading } from '../../components/ui';
import { ErrorNotice, FormActions, FormField } from '../../components/FormControls';

type Student = {
  id: string;
  fullName: string;
  college: string | null;
  course: string | null;
  languages: string[];
  weeklyAvailabilityHours: number | null;
  expectedMonthlyRate: string | null;
  portfolioUrl?: string | null;
  skills: Array<{ name: string; proficiencyLevel: string }>;
  averageRating: number | null;
};
export function MarketplacePage() {
  const { t } = useTranslation();
  const data = useRemoteData<{ items: Student[] }>('/marketplace/students?page=1&limit=30');
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen) return;
    const f = new FormData(e.currentTarget);
    try {
      await api.post('/artisans/me/marketplace-requests', {
        studentProfileId: chosen,
        message: String(f.get('message')),
        requestedServices: String(f.get('services'))
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        proposedDurationMonths: Number(f.get('duration')),
        proposedMonthlyBudget: Number(f.get('budget')) || null,
      });
      setChosen(null);
    } catch (x) {
      setError(x);
    }
  }
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  return (
    <section>
      <h2>{t('focus.verifiedManagers')}</h2>
      <p className="page-intro">{t('focus.findManagerIntro')}</p>
      <div className="record-list">
        {data.data?.items.length ? (
          data.data.items.map((s) => (
            <Card className="record-card" key={s.id}>
              <div>
                <h3>{s.fullName}</h3>
                <p>
                  {s.college} · {s.course}
                </p>
                <p>{s.skills.map((x) => x.name).join(', ')}</p>
                <p>
                  {s.languages.join(', ')} · {s.weeklyAvailabilityHours} hours/week · ₹
                  {s.expectedMonthlyRate ?? '—'}
                </p>
                <p>Rating: {s.averageRating ?? 'New'}</p>
              </div>
              <div className="form-actions">
                <ButtonLink variant="secondary" to={s.id}>
                  {t('focus.viewProfile')}
                </ButtonLink>
                <Button onClick={() => setChosen(s.id)}>{t('focus.sendInterest')}</Button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState title={t('focus.noManagers')} description={t('focus.noManagersText')} />
        )}
      </div>
      {chosen && (
        <Card className="form-card">
          <h3>{t('focus.interestRequest')}</h3>
          <ErrorNotice error={error} />
          <form onSubmit={send}>
            <FormField name="message" label={t('focus.message')} required />
            <FormField name="services" label={t('focus.servicesNeeded')} required />
            <FormField
              name="duration"
              type="number"
              min={1}
              max={12}
              defaultValue={3}
              label={t('focus.months')}
              required
            />
            <FormField name="budget" type="number" min={1} label={t('focus.proposedBudget')} />
            <FormActions busy={false}>{t('focus.sendInterest')}</FormActions>
          </form>
        </Card>
      )}
    </section>
  );
}

export function StudentMarketplaceProfilePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const data = useRemoteData<Student>('/marketplace/students/' + id);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api.post('/artisans/me/marketplace-requests', {
        studentProfileId: id,
        message: String(form.get('message') ?? ''),
        requestedServices: String(form.get('services') ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        proposedDurationMonths: Number(form.get('duration')),
        proposedMonthlyBudget: Number(form.get('budget')) || null,
      });
      location.assign('/dashboard/artisan/find-manager');
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorNotice error={data.error} />;
  const student = data.data;
  return (
    <section>
      <Link className="text-link" to="/dashboard/artisan/find-manager">
        {t('focus.backToManagers')}
      </Link>
      <Card className="form-card">
        <h2>{student.fullName}</h2>
        <p>{[student.college, student.course].filter(Boolean).join(' · ')}</p>
        <dl className="profile-details">
          <div>
            <dt>{t('focus.skills')}</dt>
            <dd>
              {student.skills
                .map((skill) => `${skill.name} (${skill.proficiencyLevel})`)
                .join(', ') || t('focus.notListed')}
            </dd>
          </div>
          <div>
            <dt>{t('focus.languages')}</dt>
            <dd>{student.languages.join(', ') || t('focus.notListed')}</dd>
          </div>
          <div>
            <dt>{t('focus.availability')}</dt>
            <dd>
              {student.weeklyAvailabilityHours === null
                ? t('focus.notListed')
                : t('focus.hoursPerWeek', { hours: student.weeklyAvailabilityHours })}
            </dd>
          </div>
          <div>
            <dt>{t('focus.expectedRate')}</dt>
            <dd>
              {student.expectedMonthlyRate === null
                ? t('focus.notListed')
                : `₹${student.expectedMonthlyRate}`}
            </dd>
          </div>
        </dl>
        {student.portfolioUrl && (
          <a className="text-link" href={student.portfolioUrl} target="_blank" rel="noreferrer">
            {t('dashboard.portfolio')}
          </a>
        )}
      </Card>
      <Card className="form-card">
        <h2>{t('focus.sendInterest')}</h2>
        <p className="page-intro">{t('focus.privateContacts')}</p>
        <ErrorNotice error={error} />
        <form onSubmit={send}>
          <FormField name="message" label={t('focus.message')} required maxLength={2000} />
          <FormField name="services" label={t('focus.servicesNeeded')} required />
          <FormField
            name="duration"
            label={t('focus.durationMonths')}
            type="number"
            min={1}
            max={12}
            defaultValue={3}
            required
          />
          <FormField name="budget" label={t('focus.proposedBudget')} type="number" min={1} />
          <FormActions busy={busy}>{t('focus.sendInterest')}</FormActions>
        </form>
      </Card>
    </section>
  );
}

export function ArtisanMarketplaceRequestsPage() {
  const { t } = useTranslation();
  const data = useRemoteData<
    Array<{
      request: {
        id: string;
        message: string;
        requestedServices: string[];
        proposedMonthlyBudget: string | null;
        status: string;
        studentResponse: string | null;
        createdAt: string;
      };
      student: { id: string; fullName: string; college: string | null; course: string | null };
    }>
  >('/artisans/me/marketplace-requests');
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  if (!data.data?.length)
    return (
      <EmptyState
        title={t('focus.noMarketplaceRequests')}
        description={t('focus.noMarketplaceRequestsText')}
      >
        <ButtonLink to="/dashboard/artisan/find-manager">{t('focus.browseManagers')}</ButtonLink>
      </EmptyState>
    );
  return (
    <section>
      <div className="record-list">
        {data.data.map(({ request, student }) => (
          <Card className="record-card" key={request.id}>
            <div>
              <h2>{student.fullName}</h2>
              <p>{[student.college, student.course].filter(Boolean).join(' · ')}</p>
              <p>{request.requestedServices.join(', ')}</p>
              <p>{request.message}</p>
              <p>
                {t('focus.budget')}:{' '}
                {request.proposedMonthlyBudget
                  ? `₹${request.proposedMonthlyBudget}/month`
                  : t('focus.notProposed')}
              </p>
              <p>
                {t('focus.sent')}: {new Date(request.createdAt).toLocaleDateString()}
              </p>
              <p>
                {t('focus.status')}: <strong>{request.status.replaceAll('_', ' ')}</strong>
              </p>
              {request.studentResponse && (
                <p>
                  {t('focus.studentResponse')}: {request.studentResponse}
                </p>
              )}
            </div>
            <ButtonLink variant="secondary" to={`/dashboard/artisan/find-manager/${student.id}`}>
              {t('focus.viewProfile')}
            </ButtonLink>
          </Card>
        ))}
      </div>
    </section>
  );
}
export function StudentInterestPage() {
  const { t } = useTranslation();
  const data = useRemoteData<
    Array<{
      request: { id: string; message: string; status: string; requestedServices: string[] };
      artisan: { businessName: string | null; fullName: string };
    }>
  >('/students/me/marketplace-requests');
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  return (
    <section>
      <h2>{t('focus.opportunityRequests')}</h2>
      <div className="record-list">
        {data.data?.map(({ request, artisan }) => (
          <Card className="record-card" key={request.id}>
            <div>
              <h3>{artisan.businessName || artisan.fullName}</h3>
              <p>{request.message}</p>
              <p>{request.requestedServices.join(', ')}</p>
              <p>{request.status}</p>
            </div>
            {request.status === 'PENDING' && (
              <div className="form-actions">
                <Button
                  onClick={() =>
                    void api
                      .post('/students/me/marketplace-requests/' + request.id + '/respond', {
                        action: 'ACCEPT',
                      })
                      .then(() => location.reload())
                  }
                >
                  {t('focus.accept')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void api
                      .post('/students/me/marketplace-requests/' + request.id + '/respond', {
                        action: 'DECLINE',
                      })
                      .then(() => location.reload())
                  }
                >
                  {t('focus.decline')}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
