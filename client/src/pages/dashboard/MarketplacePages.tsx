import { useState, type FormEvent } from 'react';
import { useRemoteData } from '../../hooks/useRemoteData';
import { api } from '../../services/api';
import { Button, Card, EmptyState, Loading } from '../../components/ui';
import { ErrorNotice, FormActions, FormField } from '../../components/FormControls';

type Student = {
  id: string;
  fullName: string;
  college: string | null;
  course: string | null;
  languages: string[];
  weeklyAvailabilityHours: number | null;
  expectedMonthlyRate: string | null;
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
              <Button onClick={() => setChosen(s.id)}>Send interest</Button>
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
