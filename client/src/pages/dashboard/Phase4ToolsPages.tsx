import { useState, type FormEvent } from 'react';
import { Button, Card, EmptyState, Loading } from '../../components/ui';
import { ErrorNotice, FormActions, FormField } from '../../components/FormControls';
import { api } from '../../services/api';
import { useRemoteData } from '../../hooks/useRemoteData';

type Role = 'artisan' | 'student';
type Payment = {
  id: string;
  periodLabel: string;
  dueDate: string;
  amount: string;
  currency: string;
  paymentMethod: string | null;
  transactionReference: string | null;
  status: string;
  paidAt: string | null;
  studentConfirmedAt: string | null;
  verifiedAt: string | null;
};

function ContractIdForm({ onSubmit }: { onSubmit: (value: string) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(String(new FormData(event.currentTarget).get('contractId') ?? '').trim());
  }
  return (
    <Card className="form-card">
      <h2>Open a contract workspace</h2>
      <p className="page-intro">
        Enter the contract ID from your accepted contract. Bharat Bazaar records external payments
        only and never holds money.
      </p>
      <form onSubmit={submit}>
        <FormField name="contractId" label="Contract ID" required />
        <FormActions busy={false}>Open contract</FormActions>
      </form>
    </Card>
  );
}

export function PaymentsPage({ role }: { role: Role }) {
  const [contractId, setContractId] = useState('');
  const data = useRemoteData<Payment[]>(contractId ? `/contracts/${contractId}/payments` : '');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function record(event: FormEvent<HTMLFormElement>, paymentId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const method = String(form.get('paymentMethod'));
    const proof = form.get('proof');
    if (proof instanceof File && proof.size > 2 * 1024 * 1024) {
      setError(new Error('Proof files must be 2 MB or smaller.'));
      return;
    }
    if (
      proof instanceof File &&
      proof.size &&
      !['image/jpeg', 'image/png', 'application/pdf'].includes(proof.type)
    ) {
      setError(new Error('Upload a JPEG, PNG, or PDF proof.'));
      return;
    }
    setBusy(paymentId);
    setError(null);
    try {
      await api.patch(`/payments/${paymentId}/external`, {
        paymentMethod: method,
        transactionReference: String(form.get('reference') ?? '') || null,
        artisanNotes: String(form.get('notes') ?? '') || null,
      });
      if (proof instanceof File && proof.size) {
        const upload = new FormData();
        upload.append('proof', proof);
        await api.post(`/payments/${paymentId}/proof`, upload);
      }
      location.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(null);
    }
  }
  async function confirm(paymentId: string) {
    setBusy(paymentId);
    setError(null);
    try {
      await api.post(`/payments/${paymentId}/confirm`, {});
      location.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(null);
    }
  }
  async function viewProof(paymentId: string) {
    setBusy(paymentId);
    setError(null);
    try {
      const response = await api.get(`/payments/${paymentId}/proof`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(null);
    }
  }
  if (!contractId) return <ContractIdForm onSubmit={setContractId} />;
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  if (!data.data?.length)
    return (
      <EmptyState
        title="No payment periods"
        description="This contract has no generated payment schedule yet."
      />
    );
  return (
    <section>
      <ErrorNotice error={error} />
      <div className="record-list">
        {data.data.map((payment) => (
          <Card className="record-card" key={payment.id}>
            <div>
              <h2>{payment.periodLabel}</h2>
              <p>
                Due {payment.dueDate} · {payment.currency} {payment.amount}
              </p>
              <p>
                Status: <strong>{payment.status.replaceAll('_', ' ')}</strong>
              </p>
              <p>Method: {payment.paymentMethod?.replaceAll('_', ' ') ?? 'Not recorded'}</p>
              {payment.transactionReference && <p>Reference: {payment.transactionReference}</p>}
              {payment.paidAt && <p>Recorded {new Date(payment.paidAt).toLocaleDateString()}</p>}
              {payment.verifiedAt && (
                <p>Verified {new Date(payment.verifiedAt).toLocaleDateString()}</p>
              )}
            </div>
            {role === 'student' ? (
              <div className="form-actions">
                {payment.status === 'PROOF_UPLOADED' || payment.status === 'RECEIVED' ? (
                  <Button disabled={busy === payment.id} onClick={() => void confirm(payment.id)}>
                    Confirm received
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  disabled={busy === payment.id}
                  onClick={() => void viewProof(payment.id)}
                >
                  View private proof
                </Button>
              </div>
            ) : (
              <form onSubmit={(event) => void record(event, payment.id)}>
                <FormField
                  kind="select"
                  name="paymentMethod"
                  label="External payment method"
                  required
                  defaultValue={payment.paymentMethod ?? 'UPI'}
                >
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </FormField>
                <FormField name="reference" label="Transaction reference" />
                <FormField kind="textarea" name="notes" label="Notes" />
                <FormField
                  name="proof"
                  label="Proof (JPEG, PNG or PDF, max 2 MB)"
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                />
                <FormActions busy={busy === payment.id}>Record external payment</FormActions>
              </form>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

export function DisputesPage({ admin = false }: { admin?: boolean }) {
  const data = useRemoteData<
    Array<{
      id: string;
      contractId: string;
      category: string;
      title: string;
      description: string;
      status: string;
      resolution: string | null;
    }>
  >('/disputes');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api.post(`/contracts/${form.get('contractId')}/disputes`, {
        category: form.get('category'),
        title: form.get('title'),
        description: form.get('description'),
      });
      location.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorNotice error={data.error} />;
  return (
    <section>
      <ErrorNotice error={error} />
      {!admin && (
        <Card className="form-card">
          <h2>Open a dispute</h2>
          <form onSubmit={open}>
            <FormField name="contractId" label="Contract ID" required />
            <FormField kind="select" name="category" label="Category" required>
              <option value="PAYMENT">Payment</option>
              <option value="WORK_QUALITY">Work quality</option>
              <option value="COMMUNICATION">Communication</option>
              <option value="CONTRACT">Contract</option>
              <option value="OTHER">Other</option>
            </FormField>
            <FormField name="title" label="Title" required />
            <FormField kind="textarea" name="description" label="What happened?" required />
            <FormActions busy={busy}>Open dispute</FormActions>
          </form>
        </Card>
      )}
      <div className="record-list">
        {data.data?.length ? (
          data.data.map((item) => (
            <Card className="record-card" key={item.id}>
              <div>
                <h2>{item.title}</h2>
                <p>
                  {item.category.replaceAll('_', ' ')} · {item.status.replaceAll('_', ' ')}
                </p>
                <p>{item.description}</p>
                {item.resolution && <p>Resolution: {item.resolution}</p>}
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No disputes"
            description="Disputes for contracts you can access appear here."
          />
        )}
      </div>
    </section>
  );
}

export function ContractReviewPage({ role }: { role: Role }) {
  const [contractId, setContractId] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  if (!contractId) return <ContractIdForm onSubmit={setContractId} />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api.post(`/contracts/${contractId}/reviews`, {
        overallRating: Number(form.get('overall')),
        communicationRating: Number(form.get('communication')),
        professionalismRating: Number(form.get('professionalism')),
        reliabilityRating: Number(form.get('reliability')),
        resultsRating: Number(form.get('results')) || null,
        reviewText: String(form.get('reviewText') ?? ''),
      });
      location.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="form-card">
      <h2>Leave a review for your {role === 'artisan' ? 'student manager' : 'artisan'}</h2>
      <p className="page-intro">
        Reviews are available after contract completion. One review per participant is allowed.
      </p>
      <ErrorNotice error={error} />
      <form onSubmit={submit}>
        {(
          [
            ['overall', 'Overall rating'],
            ['communication', 'Communication'],
            ['professionalism', 'Professionalism'],
            ['reliability', 'Reliability'],
            ['results', 'Results (optional)'],
          ] as Array<[string, string]>
        ).map(([name, label]) => (
          <FormField
            key={name}
            name={name}
            label={label}
            type="number"
            min={1}
            max={5}
            required={name !== 'results'}
          />
        ))}
        <FormField
          kind="textarea"
          name="reviewText"
          label="Written review"
          required
          maxLength={3000}
        />
        <FormActions busy={busy}>Submit review</FormActions>
      </form>
    </Card>
  );
}

export function CompletionPage() {
  const [contractId, setContractId] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  if (!contractId) return <ContractIdForm onSubmit={setContractId} />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api.post(`/contracts/${contractId}/completion`, {
        completionSummary: form.get('summary'),
        finalMetricsConfirmed: form.get('metrics') === 'on',
        explanation: form.get('explanation') || null,
      });
      location.reload();
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="form-card">
      <h2>Request contract completion</h2>
      <p className="page-intro">
        All required tasks should be complete. If a final metric is unavailable, explain why.
      </p>
      <ErrorNotice error={error} />
      <form onSubmit={submit}>
        <FormField kind="textarea" name="summary" label="Completion summary" required />
        <label className="check-option">
          <input type="checkbox" name="metrics" /> Final metrics are confirmed
        </label>
        <FormField
          kind="textarea"
          name="explanation"
          label="Reason if final metrics are unavailable"
        />
        <FormActions busy={busy}>Request completion</FormActions>
      </form>
    </Card>
  );
}
