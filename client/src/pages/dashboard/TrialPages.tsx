import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, ButtonLink, Card, EmptyState, Loading, Badge } from '../../components/ui';
import { ErrorNotice, FormActions, FormField } from '../../components/FormControls';
import { api } from '../../services/api';
import { useRemoteData } from '../../hooks/useRemoteData';
import type {
  Assignment,
  DiscoveryReport,
  GrowthRequest,
  GrowthRequestDetail,
  PageResult,
  Skill,
  TrialContract,
} from '../../types';

const text = (value: FormDataEntryValue | null) => String(value ?? '').trim();
function Status({ value }: { value: string }) {
  return (
    <Badge tone={value === 'ACTIVE' || value === 'APPROVED' ? 'green' : 'indigo'}>
      {value.replaceAll('_', ' ')}
    </Badge>
  );
}
function Call({
  children,
  onClick,
  busy = false,
}: {
  children: string;
  onClick: () => Promise<unknown>;
  busy?: boolean;
}) {
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  return (
    <>
      <Button
        disabled={busy || working}
        onClick={() =>
          void (async () => {
            setWorking(true);
            setError(null);
            try {
              await onClick();
              location.reload();
            } catch (e) {
              setError(e);
            } finally {
              setWorking(false);
            }
          })()
        }
      >
        {working ? 'Working…' : children}
      </Button>
      <ErrorNotice error={error} />
    </>
  );
}
export function ArtisanGrowthRequestsPage() {
  const { t } = useTranslation();
  const data = useRemoteData<PageResult<GrowthRequest>>(
    '/artisans/me/growth-requests?page=1&limit=20',
  );
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  return (
    <section>
      <div className="overview-actions">
        <ButtonLink to="new">{t('p3.newRequest')}</ButtonLink>
      </div>
      {!data.data?.items.length ? (
        <EmptyState title={t('p3.noRequests')} description={t('p3.noRequestsText')}>
          <ButtonLink to="new">{t('p3.newRequest')}</ButtonLink>
        </EmptyState>
      ) : (
        <div className="record-list">
          {data.data.items.map((request) => (
            <Card className="record-card" key={request.id}>
              <div>
                <h2>{request.title}</h2>
                <Status value={request.status} />
                <p>{request.problemDescription}</p>
              </div>
              <ButtonLink variant="secondary" to={request.id}>
                {t('p3.open')}
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
export function ArtisanRequestFormPage() {
  const { t } = useTranslation();
  const skills = useRemoteData<Skill[]>('/skills');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const skillIds = form.getAll('skillIds');
    setBusy(true);
    setError(null);
    try {
      const response = await api.post('/artisans/me/growth-requests', {
        title: text(form.get('title')),
        problemDescription: text(form.get('problemDescription')),
        preferredLanguage: text(form.get('preferredLanguage')),
        preferredDurationMonths: Number(form.get('preferredDurationMonths')),
        skillIds,
      });
      location.assign('/dashboard/artisan/growth-requests/' + response.data.data.id);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <Card className="form-card">
        <h2>{t('p3.newRequest')}</h2>
        <p className="page-intro">{t('p3.requestIntro')}</p>
        <ErrorNotice error={error} />
        <form onSubmit={submit}>
          <FormField name="title" label={t('p3.title')} required maxLength={160} />
          <FormField
            kind="textarea"
            name="problemDescription"
            label={t('p3.problem')}
            required
            maxLength={5000}
          />
          <FormField
            kind="select"
            name="preferredLanguage"
            label={t('p3.language')}
            required
            defaultValue="EN"
          >
            <option value="EN">English</option>
            <option value="HI">हिन्दी</option>
          </FormField>
          <FormField
            type="number"
            name="preferredDurationMonths"
            label={t('p3.duration')}
            required
            min={1}
            max={12}
            defaultValue={3}
          />
          <fieldset className="field">
            <legend>{t('p3.skills')}</legend>
            {skills.data?.map((skill) => (
              <label key={skill.id} className="check-option">
                <input name="skillIds" type="checkbox" value={skill.id} />
                {skill.name}
              </label>
            ))}
          </fieldset>
          <FormActions busy={busy}>{t('p3.saveDraft')}</FormActions>
        </form>
      </Card>
    </section>
  );
}
export function ArtisanRequestDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const data = useRemoteData<GrowthRequestDetail>('/artisans/me/growth-requests/' + id);
  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorNotice error={data.error} />;
  const d = data.data;
  return (
    <section>
      <Link className="text-link" to="/dashboard/artisan/growth-requests">
        {t('p3.back')}
      </Link>
      <Card className="form-card">
        <h2>{d.request.title}</h2>
        <Status value={d.request.status} />
        <p>{d.request.problemDescription}</p>
        <p>
          {t('p3.skills')}: {d.skills.map((s) => s.name).join(', ')}
        </p>
        {d.request.status === 'DRAFT' && (
          <Call onClick={() => api.post('/artisans/me/growth-requests/' + id + '/submit', {})}>
            {t('p3.submit')}
          </Call>
        )}
        {d.assignment && (
          <p>
            {t('p3.managerAssigned')} <Status value={d.assignment.status} />
          </p>
        )}
        {d.contract && (
          <ButtonLink to={'/dashboard/artisan/contract/' + d.contract.id}>
            {t('p3.viewContract')}
          </ButtonLink>
        )}
      </Card>
    </section>
  );
}
export function StudentAssignmentsPage() {
  const { t } = useTranslation();
  const data = useRemoteData<
    Array<{
      assignment: Assignment;
      request: GrowthRequest;
      artisan: { fullName: string; businessName: string };
    }>
  >('/students/me/assignments');
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  return (
    <section>
      {!data.data?.length ? (
        <EmptyState title={t('p3.noAssignments')} description={t('p3.noAssignmentsText')} />
      ) : (
        <div className="record-list">
          {data.data.map(({ assignment, request, artisan }) => (
            <Card className="record-card" key={assignment.id}>
              <div>
                <h2>{artisan.businessName || artisan.fullName}</h2>
                <p>{request.title}</p>
                <Status value={assignment.status} />
              </div>
              {assignment.status === 'PROPOSED' ? (
                <Call
                  onClick={() =>
                    api.post('/students/me/assignments/' + assignment.id + '/accept', {})
                  }
                >
                  {t('p3.accept')}
                </Call>
              ) : (
                <ButtonLink
                  variant="secondary"
                  to={'/dashboard/student/assignment/' + assignment.id}
                >
                  {t('p3.open')}
                </ButtonLink>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
export function DiscoveryPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const previous = useRemoteData<DiscoveryReport | null>(
    '/students/me/assignments/' + id + '/discovery',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent<HTMLFormElement>, send: boolean) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      businessSummary: text(f.get('businessSummary')),
      identifiedProblems: text(f.get('identifiedProblems')),
      recommendedServices: text(f.get('recommendedServices')),
      proposedDeliverables: text(f.get('proposedDeliverables')),
      proposedDurationMonths: Number(f.get('proposedDurationMonths')),
      knownConstraints: text(f.get('knownConstraints')),
      successMeasurementPlan: text(f.get('successMeasurementPlan')),
      additionalNotes: text(f.get('additionalNotes')) || null,
    };
    setBusy(true);
    try {
      await api[send ? 'post' : 'put'](
        '/students/me/assignments/' + id + '/discovery' + (send ? '/submit' : ''),
        body,
      );
      location.assign('/dashboard/student/current-artisan');
    } catch (x) {
      setError(x);
    } finally {
      setBusy(false);
    }
  }
  if (previous.loading) return <Loading />;
  const p = previous.data;
  const fields = [
    'businessSummary',
    'identifiedProblems',
    'recommendedServices',
    'proposedDeliverables',
    'knownConstraints',
    'successMeasurementPlan',
  ] as const;
  return (
    <section>
      <Card className="form-card">
        <h2>{t('p3.discovery')}</h2>
        <ErrorNotice error={error} />
        {p?.adminFeedback && <p className="notice">{p.adminFeedback}</p>}
        <form onSubmit={(e) => void submit(e, false)}>
          {fields.map((key) => (
            <FormField
              key={key}
              kind="textarea"
              name={key}
              label={t('p3.' + key)}
              required
              defaultValue={p?.[key] ?? ''}
            />
          ))}
          <FormField
            type="number"
            name="proposedDurationMonths"
            label={t('p3.duration')}
            min={1}
            max={12}
            required
            defaultValue={p?.proposedDurationMonths ?? 3}
          />
          <FormField
            kind="textarea"
            name="additionalNotes"
            label={t('p3.notes')}
            defaultValue={p?.additionalNotes ?? ''}
          />
          <div className="form-actions">
            <Button type="submit" disabled={busy}>
              {t('p3.saveDraft')}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={(e) => {
                const form = e.currentTarget.form;
                if (form)
                  void submit(
                    { preventDefault() {}, currentTarget: form } as FormEvent<HTMLFormElement>,
                    true,
                  );
              }}
            >
              {t('p3.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
export function ContractPage({ role }: { role: 'artisan' | 'student' }) {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const data = useRemoteData<TrialContract>(
    '/' + (role === 'artisan' ? 'artisans' : 'students') + '/me/contracts/' + id,
  );
  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorNotice error={data.error} />;
  const c = data.data;
  return (
    <section>
      <Card className="form-card">
        <h2>{c.title}</h2>
        <Status value={c.status} />
        <dl className="profile-details">
          {(
            [
              'problemStatement',
              'responsibilities',
              'deliverables',
              'growthTargets',
              'exclusions',
            ] as const
          ).map((k) => (
            <div key={k}>
              <dt>{t('p3.' + k)}</dt>
              <dd>{c[k]}</dd>
            </div>
          ))}
        </dl>
        {c.status === 'AWAITING_ACCEPTANCE' && (
          <Call
            onClick={() =>
              api.post(
                '/' +
                  (role === 'artisan' ? 'artisans' : 'students') +
                  '/me/contracts/' +
                  id +
                  '/accept',
                {},
              )
            }
          >
            {t('p3.acceptContract')}
          </Call>
        )}
        {c.status === 'ACTIVE' && (
          <div className="form-actions">
            <ButtonLink to={'/dashboard/' + role + '/contract/' + id + '/tasks'}>
              {t('p3.tasks')}
            </ButtonLink>
            <ButtonLink
              variant="secondary"
              to={'/dashboard/' + role + '/contract/' + id + '/metrics'}
            >
              {t('p3.metrics')}
            </ButtonLink>
          </div>
        )}
      </Card>
    </section>
  );
}
export function TasksPage({ role }: { role: 'artisan' | 'student' }) {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const d = useRemoteData<
    Array<{
      id: string;
      title: string;
      status: string;
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        status: string;
        submissionNotes: string | null;
        artisanFeedback: string | null;
      }>;
    }>
  >('/' + (role === 'artisan' ? 'artisans' : 'students') + '/me/contracts/' + id + '/tasks');
  if (d.loading) return <Loading />;
  if (d.error) return <ErrorNotice error={d.error} />;
  return (
    <section>
      <h2>{t('p3.tasks')}</h2>
      <div className="record-list">
        {d.data?.flatMap((m) =>
          m.tasks.map((task) => (
            <Card className="record-card" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <Status value={task.status} />
                {task.artisanFeedback && <p className="notice">{task.artisanFeedback}</p>}
              </div>
              {role === 'student' &&
                ['TODO', 'IN_PROGRESS', 'REVISION_REQUIRED'].includes(task.status) && (
                  <Call
                    onClick={() =>
                      api.patch('/students/me/tasks/' + task.id, {
                        status: 'SUBMITTED',
                        submissionNotes: 'Completed and ready for artisan review.',
                      })
                    }
                  >
                    {t('p3.submitTask')}
                  </Call>
                )}
              {role === 'artisan' && task.status === 'SUBMITTED' && (
                <Call
                  onClick={() =>
                    api.patch('/artisans/me/tasks/' + task.id + '/review', { action: 'APPROVE' })
                  }
                >
                  {t('p3.approve')}
                </Call>
              )}
            </Card>
          )),
        )}
      </div>
    </section>
  );
}
export function MetricsPage({ role }: { role: 'artisan' | 'student' }) {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const d = useRemoteData<
    Array<{
      id: string;
      type: string;
      measurementDate: string;
      monthlyRevenue: string | null;
      monthlyOrders: number | null;
      onlineOrders: number | null;
      socialFollowers: number | null;
      customerEnquiries: number | null;
      productsListedOnline: number | null;
      notes: string | null;
    }>
  >('/' + (role === 'artisan' ? 'artisans' : 'students') + '/me/contracts/' + id + '/metrics');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api.post(
        '/' + (role === 'artisan' ? 'artisans' : 'students') + '/me/contracts/' + id + '/metrics',
        {
          type: text(f.get('type')),
          measurementDate: text(f.get('measurementDate')),
          monthlyOrders: Number(f.get('monthlyOrders')) || null,
          onlineOrders: Number(f.get('onlineOrders')) || null,
          socialFollowers: Number(f.get('socialFollowers')) || null,
          notes: text(f.get('notes')) || null,
        },
      );
      location.reload();
    } catch (x) {
      setError(x);
    } finally {
      setBusy(false);
    }
  }
  if (d.loading) return <Loading />;
  return (
    <section>
      <Card className="form-card">
        <h2>{t('p3.metrics')}</h2>
        <ErrorNotice error={d.error || error} />
        <form onSubmit={submit}>
          <FormField kind="select" name="type" label={t('p3.metricType')} required>
            <option value="PROGRESS">{t('p3.progress')}</option>
            <option value="BASELINE">{t('p3.baseline')}</option>
            <option value="FINAL">{t('p3.final')}</option>
          </FormField>
          <FormField type="date" name="measurementDate" label={t('p3.measurementDate')} required />
          <FormField type="number" name="monthlyOrders" label={t('p3.monthlyOrders')} min={0} />
          <FormField type="number" name="onlineOrders" label={t('p3.onlineOrders')} min={0} />
          <FormField type="number" name="socialFollowers" label={t('p3.followers')} min={0} />
          <FormField kind="textarea" name="notes" label={t('p3.notes')} />
          <FormActions busy={busy}>{t('p3.save')}</FormActions>
        </form>
      </Card>
      <div className="record-list">
        {d.data?.map((metric) => (
          <Card key={metric.id}>
            <Status value={metric.type} />
            <p>{metric.measurementDate}</p>
            <p>
              {t('p3.monthlyOrders')}: {metric.monthlyOrders ?? '—'}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
export function AdminGrowthRequestsPage() {
  const { t } = useTranslation();
  const d = useRemoteData<
    PageResult<{ request: GrowthRequest; artisan: { fullName: string; businessName: string } }>
  >('/admin/growth-requests?page=1&limit=50');
  if (d.loading) return <Loading />;
  if (d.error) return <ErrorNotice error={d.error} />;
  return (
    <section>
      <div className="record-list">
        {d.data?.items.map(({ request, artisan }) => (
          <Card className="record-card" key={request.id}>
            <div>
              <h2>{request.title}</h2>
              <p>{artisan.businessName || artisan.fullName}</p>
              <Status value={request.status} />
            </div>
            <ButtonLink variant="secondary" to={request.id}>
              {t('p3.open')}
            </ButtonLink>
          </Card>
        ))}
      </div>
    </section>
  );
}
export function AdminGrowthRequestDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const d = useRemoteData<GrowthRequestDetail>('/admin/growth-requests/' + id);
  const candidates = useRemoteData<
    Array<{
      studentProfileId: string;
      fullName: string;
      college: string;
      score: number;
      matchedSkills: Skill[];
    }>
  >('/admin/growth-requests/' + id + '/candidates');
  if (d.loading || candidates.loading) return <Loading />;
  if (d.error) return <ErrorNotice error={d.error} />;
  const r = d.data;
  return (
    <section>
      {r && (
        <Card className="form-card">
          <h2>{r.request.title}</h2>
          <Status value={r.request.status} />
          {r.request.status === 'SUBMITTED' && (
            <Call
              onClick={() =>
                api.patch('/admin/growth-requests/' + id + '/review', { status: 'UNDER_REVIEW' })
              }
            >
              {t('p3.startReview')}
            </Call>
          )}
          {r.assignment && (
            <div className="form-actions">
              <ButtonLink to={'/dashboard/admin/assignments/' + r.assignment.id}>
                {t('p3.openAssignment')}
              </ButtonLink>
            </div>
          )}
          <h3>{t('p3.rankedCandidates')}</h3>
          {candidates.data?.map((c) => (
            <div className="record-card" key={c.studentProfileId}>
              <div>
                <strong>{c.fullName}</strong>
                <p>
                  {c.college} · {c.score}/100
                </p>
                <p>{c.matchedSkills.map((s) => s.name).join(', ')}</p>
              </div>
              {['SUBMITTED', 'UNDER_REVIEW'].includes(r.request.status) && (
                <Call
                  onClick={() =>
                    api.post('/admin/growth-requests/' + id + '/assign', {
                      studentProfileId: c.studentProfileId,
                    })
                  }
                >
                  {t('p3.assign')}
                </Call>
              )}
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}

export function AdminAssignmentPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const data = useRemoteData<{
    discovery: DiscoveryReport | null;
    contract: TrialContract | null;
    assignment: Assignment;
  }>('/admin/assignments/' + id);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/contracts', {
        assignmentId: id,
        title: text(form.get('title')),
        problemStatement: text(form.get('problemStatement')),
        responsibilities: text(form.get('responsibilities')),
        deliverables: text(form.get('deliverables')),
        growthTargets: text(form.get('growthTargets')),
        exclusions: text(form.get('exclusions')),
        startDate: text(form.get('startDate')),
        endDate: text(form.get('endDate')),
        platformStudentStipend: 0,
      });
      location.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (data.loading) return <Loading />;
  if (data.error || !data.data) return <ErrorNotice error={data.error} />;
  const { discovery, contract } = data.data;
  return (
    <section>
      <Card className="form-card">
        <h2>{t('p3.assignmentProgress')}</h2>
        <Status value={data.data.assignment.status} />
        {discovery && (
          <>
            <h3>{t('p3.discovery')}</h3>
            <Status value={discovery.status} />
            <p>{discovery.businessSummary}</p>
            {discovery.status === 'SUBMITTED' && (
              <Call
                onClick={() =>
                  api.patch('/admin/assignments/' + id + '/discovery', { action: 'REVIEW' })
                }
              >
                {t('p3.approveDiscovery')}
              </Call>
            )}
          </>
        )}
        {contract && (
          <>
            <h3>{contract.title}</h3>
            <Status value={contract.status} />
            {contract.status === 'DRAFT' && (
              <Call onClick={() => api.post('/admin/contracts/' + contract.id + '/send', {})}>
                {t('p3.sendContract')}
              </Call>
            )}
          </>
        )}
      </Card>
      {discovery?.status === 'REVIEWED' && !contract && (
        <Card className="form-card">
          <h2>{t('p3.createContract')}</h2>
          <ErrorNotice error={error} />
          <form onSubmit={create}>
            <FormField
              name="title"
              label={t('p3.title')}
              required
              defaultValue="Free trial growth plan"
            />
            <FormField
              kind="textarea"
              name="problemStatement"
              label={t('p3.problemStatement')}
              required
            />
            <FormField
              kind="textarea"
              name="responsibilities"
              label={t('p3.responsibilities')}
              required
            />
            <FormField kind="textarea" name="deliverables" label={t('p3.deliverables')} required />
            <FormField
              kind="textarea"
              name="growthTargets"
              label={t('p3.growthTargets')}
              required
            />
            <FormField kind="textarea" name="exclusions" label={t('p3.exclusions')} required />
            <FormField type="date" name="startDate" label={t('p3.startDate')} required />
            <FormField type="date" name="endDate" label={t('p3.endDate')} required />
            <FormActions busy={busy}>{t('p3.createContract')}</FormActions>
          </form>
        </Card>
      )}
    </section>
  );
}
