import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Card, EmptyState, Loading } from '../../components/ui';
import { ErrorNotice } from '../../components/FormControls';
import { useRemoteData } from '../../hooks/useRemoteData';

type Person = { fullName: string; businessName?: string | null };
type Contract = {
  id: string;
  title: string;
  contractType: string;
  status: string;
  startDate: string;
  endDate: string;
  artisanPaymentAmount: string;
  deliverables: string;
};
type Row = {
  contract?: Contract;
  assignment?: { id: string; type: string; status: string; assignedAt: string };
  artisan?: Person;
  student?: Person;
  payment?: {
    id: string;
    periodLabel: string;
    amount: string;
    paymentMethod: string | null;
    status: string;
    paidAt: string | null;
    studentConfirmedAt: string | null;
    verifiedAt: string | null;
  };
  completion?: { id: string; status: string; completionSummary: string; createdAt: string };
  id?: string;
  overallRating?: number;
  reviewText?: string;
  hiddenByAdmin?: boolean;
  reviewerRole?: string;
  createdAt?: string;
};
const person = (value?: Person) => value?.businessName || value?.fullName || '—';
function State({ value }: { value?: string }) {
  return (
    <Badge tone={value === 'COMPLETED' || value === 'VERIFIED' ? 'green' : 'indigo'}>
      {value?.replaceAll('_', ' ') || '—'}
    </Badge>
  );
}
function Records({
  endpoint,
  children,
}: {
  endpoint: string;
  children: (row: Row) => React.ReactNode;
}) {
  const d = useRemoteData<Row[]>(endpoint);
  const { t } = useTranslation();
  if (d.loading) return <Loading />;
  if (d.error) return <ErrorNotice error={d.error} />;
  if (!d.data?.length)
    return <EmptyState title={t('phase4.noRecords')} description={t('phase4.noRecordsText')} />;
  return (
    <section className="record-list">
      {d.data.map((row, i) => (
        <Card
          className="record-card"
          key={row.contract?.id ?? row.payment?.id ?? row.completion?.id ?? row.id ?? i}
        >
          {children(row)}
        </Card>
      ))}
    </section>
  );
}
export function AdminPaidAssignmentsPage() {
  return (
    <Records endpoint="/admin/paid-assignments">
      {(r) => (
        <>
          <h2>
            {person(r.artisan)} → {person(r.student)}
          </h2>
          <p>
            {r.assignment?.type} · <State value={r.assignment?.status} />
          </p>
          <p>
            {r.assignment?.assignedAt && new Date(r.assignment.assignedAt).toLocaleDateString()}
          </p>
        </>
      )}
    </Records>
  );
}
export function AdminPaidContractsPage() {
  return (
    <Records endpoint="/admin/paid-contracts">
      {(r) => (
        <>
          <h2>{r.contract?.title}</h2>
          <p>
            {person(r.artisan)} · {person(r.student)}
          </p>
          <p>
            <State value={r.contract?.status} /> · ₹{r.contract?.artisanPaymentAmount}
          </p>
          <p>
            {r.contract?.startDate} – {r.contract?.endDate}
          </p>
        </>
      )}
    </Records>
  );
}
export function AdminPaymentRecordsPage() {
  return (
    <Records endpoint="/admin/payment-records">
      {(r) => (
        <>
          <h2>{r.payment?.periodLabel}</h2>
          <p>
            {person(r.artisan)} · {person(r.student)} · ₹{r.payment?.amount}
          </p>
          <p>
            {r.payment?.paymentMethod?.replaceAll('_', ' ') || '—'} ·{' '}
            <State value={r.payment?.status} />
          </p>
          <p>
            Artisan: {r.payment?.paidAt ? 'Recorded' : 'Not recorded'} · Student:{' '}
            {r.payment?.studentConfirmedAt ? 'Confirmed' : 'Pending'}
          </p>
        </>
      )}
    </Records>
  );
}
export function AdminReviewsPage() {
  return (
    <Records endpoint="/admin/reviews">
      {(r) => (
        <>
          <h2>
            {r.reviewerRole} review · {r.overallRating}/5
          </h2>
          <p>{r.reviewText}</p>
          <p>
            <State value={r.hiddenByAdmin ? 'HIDDEN' : 'VISIBLE'} />
          </p>
        </>
      )}
    </Records>
  );
}
export function AdminCompletionRequestsPage() {
  return (
    <Records endpoint="/admin/completions">
      {(r) => (
        <>
          <h2>{r.contract?.title}</h2>
          <p>
            {person(r.artisan)} · {person(r.student)}
          </p>
          <p>
            <State value={r.completion?.status} /> · <State value={r.contract?.status} />
          </p>
          <p>{r.completion?.completionSummary}</p>
        </>
      )}
    </Records>
  );
}
export function ParticipantPaidContractsPage() {
  return (
    <Records endpoint="/participants/me/paid-contracts">
      {(r) => (
        <>
          <h2>{r.contract?.title}</h2>
          <p>
            {person(r.artisan)} · {person(r.student)}
          </p>
          <p>
            <State value={r.contract?.status} /> · ₹{r.contract?.artisanPaymentAmount}
          </p>
          <p>
            {r.contract?.startDate} – {r.contract?.endDate}
          </p>
        </>
      )}
    </Records>
  );
}
export function ParticipantContractDetailPage() {
  const { id = '' } = useParams();
  const d = useRemoteData<{
    contract: Contract;
    artisan: Person;
    student: Person;
    discovery: { recommendedServices: string } | null;
  }>('/contracts/' + id);
  if (d.loading) return <Loading />;
  if (d.error || !d.data) return <ErrorNotice error={d.error} />;
  const x = d.data;
  return (
    <section>
      <Card className="form-card">
        <h2>{x.contract.title}</h2>
        <p>
          {person(x.artisan)} · {person(x.student)}
        </p>
        <State value={x.contract.status} />
        <p>
          {x.contract.startDate} – {x.contract.endDate} · ₹{x.contract.artisanPaymentAmount}
        </p>
        <h3>Deliverables</h3>
        <p>{x.contract.deliverables}</p>
        <h3>Discovery</h3>
        <p>{x.discovery?.recommendedServices || '—'}</p>
      </Card>
    </section>
  );
}
export function StudentPortfolioPage() {
  return (
    <Records endpoint="/students/me/portfolio">
      {(r) => (
        <>
          <h2>{r.contract?.title}</h2>
          <p>{person(r.artisan)}</p>
          <p>{r.contract?.deliverables}</p>
          <p>
            {r.contract?.startDate} – {r.contract?.endDate} · <State value={r.contract?.status} />
          </p>
        </>
      )}
    </Records>
  );
}
export function ApiListPage({ endpoint }: { endpoint: string; title: string }) {
  if (endpoint.includes('payment')) return <AdminPaymentRecordsPage />;
  if (endpoint.includes('reviews')) return <AdminReviewsPage />;
  if (endpoint.includes('completion')) return <AdminCompletionRequestsPage />;
  if (endpoint.includes('assignments')) return <AdminPaidAssignmentsPage />;
  if (endpoint.includes('participants')) return <ParticipantPaidContractsPage />;
  if (endpoint.includes('portfolio')) return <StudentPortfolioPage />;
  return <AdminPaidContractsPage />;
}
export const PaidContractDetailPage = ParticipantContractDetailPage;
