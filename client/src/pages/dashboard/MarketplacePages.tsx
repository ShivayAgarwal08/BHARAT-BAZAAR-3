import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
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
      <h2>Verified student managers</h2>
      <p className="page-intro">Send an interest request. Payments stay outside Bharat Bazaar.</p>
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
                  View profile
                </ButtonLink>
                <Button onClick={() => setChosen(s.id)}>Send interest</Button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No verified students found"
            description="Try again after student verification."
          />
        )}
      </div>
      {chosen && (
        <Card className="form-card">
          <h3>Interest request</h3>
          <ErrorNotice error={error} />
          <form onSubmit={send}>
            <FormField name="message" label="Message" required />
            <FormField name="services" label="Services needed (comma separated)" required />
            <FormField
              name="duration"
              type="number"
              min={1}
              max={12}
              defaultValue={3}
              label="Months"
              required
            />
            <FormField name="budget" type="number" min={1} label="Proposed monthly budget" />
            <FormActions busy={false}>Send request</FormActions>
          </form>
        </Card>
      )}
    </section>
  );
}

export function StudentMarketplaceProfilePage() {
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
      location.assign('/dashboard/artisan/marketplace-requests');
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
      <Link className="text-link" to="/dashboard/artisan/marketplace">
        Back to marketplace
      </Link>
      <Card className="form-card">
        <h2>{student.fullName}</h2>
        <p>{[student.college, student.course].filter(Boolean).join(' · ')}</p>
        <dl className="profile-details">
          <div>
            <dt>Skills</dt>
            <dd>
              {student.skills
                .map((skill) => `${skill.name} (${skill.proficiencyLevel})`)
                .join(', ') || 'Not listed'}
            </dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>{student.languages.join(', ') || 'Not listed'}</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{student.weeklyAvailabilityHours ?? 'Not listed'} hours/week</dd>
          </div>
          <div>
            <dt>Expected monthly rate</dt>
            <dd>₹{student.expectedMonthlyRate ?? 'Not listed'}</dd>
          </div>
        </dl>
        {student.portfolioUrl && (
          <a className="text-link" href={student.portfolioUrl} target="_blank" rel="noreferrer">
            View portfolio
          </a>
        )}
      </Card>
      <Card className="form-card">
        <h2>Send an interest request</h2>
        <p className="page-intro">
          Contact details stay private. Payments happen outside Bharat Bazaar.
        </p>
        <ErrorNotice error={error} />
        <form onSubmit={send}>
          <FormField name="message" label="Message" required maxLength={2000} />
          <FormField name="services" label="Services needed (comma separated)" required />
          <FormField
            name="duration"
            label="Duration in months"
            type="number"
            min={1}
            max={12}
            defaultValue={3}
            required
          />
          <FormField name="budget" label="Proposed monthly budget" type="number" min={1} />
          <FormActions busy={busy}>Send request</FormActions>
        </form>
      </Card>
    </section>
  );
}

export function ArtisanMarketplaceRequestsPage() {
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
        title="No marketplace requests yet"
        description="Browse verified student managers to send your first interest request."
      >
        <ButtonLink to="/dashboard/artisan/marketplace">Browse marketplace</ButtonLink>
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
                Budget:{' '}
                {request.proposedMonthlyBudget
                  ? `₹${request.proposedMonthlyBudget}/month`
                  : 'Not proposed'}
              </p>
              <p>Sent: {new Date(request.createdAt).toLocaleDateString()}</p>
              <p>
                Status: <strong>{request.status.replaceAll('_', ' ')}</strong>
              </p>
              {request.studentResponse && <p>Student response: {request.studentResponse}</p>}
            </div>
            <ButtonLink variant="secondary" to={`/dashboard/artisan/marketplace/${student.id}`}>
              View profile
            </ButtonLink>
          </Card>
        ))}
      </div>
    </section>
  );
}
export function StudentInterestPage() {
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
      <h2>Marketplace interest requests</h2>
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
                  Accept
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
                  Decline
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
