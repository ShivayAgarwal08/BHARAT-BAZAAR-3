import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { Card, ButtonLink, EmptyState } from '../components/ui';
import { ErrorNotice, FormActions, FormField } from '../components/FormControls';
import { usePageTitle } from '../hooks/usePageTitle';

export function AssistedRegistrationPage() {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [done, setDone] = useState(false);
  usePageTitle(t('p2.helpRegister'));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api.post('/assisted-registrations', values);
      setDone(true);
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container phase2-page narrow-page">
      <p className="eyebrow">{t('p2.humanHelp')}</p>
      <h1>{t('p2.helpRegister')}</h1>
      <p className="page-intro">{t('p2.helpIntro')}</p>
      <Card className="form-card">
        {done ? (
          <div role="status">
            <EmptyState title={t('p2.helpSuccess')} description={t('p2.helpSuccessText')}>
              <ButtonLink to="/">{t('common.backHome')}</ButtonLink>
            </EmptyState>
          </div>
        ) : (
          <form onSubmit={submit} aria-busy={busy}>
            <p className="field-hint">{t('p2.requiredNote')}</p>
            <ErrorNotice error={error} />
            <div className="form-grid">
              <FormField
                name="name"
                label={t('p2.fields.name')}
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
              />
              <FormField
                name="phone"
                label={t('p2.fields.phone')}
                type="tel"
                required
                autoComplete="tel"
                maxLength={25}
                pattern="[+0-9 ()-]{10,25}"
                hint={t('p2.phoneHint')}
              />
              <FormField
                name="preferredLanguage"
                label={t('p2.fields.preferredLanguage')}
                kind="select"
                defaultValue={i18n.resolvedLanguage === 'hi' ? 'HI' : 'EN'}
                required
              >
                <option value="EN">English</option>
                <option value="HI">हिन्दी</option>
              </FormField>
              <FormField
                name="preferredCallTime"
                label={t('p2.fields.preferredCallTime')}
                required
                minLength={2}
                maxLength={160}
                hint={t('p2.callTimeHint')}
              />
              <FormField
                name="city"
                label={t('p2.fields.city')}
                required
                maxLength={100}
                autoComplete="address-level2"
              />
              <FormField
                name="state"
                label={t('p2.fields.state')}
                required
                maxLength={100}
                autoComplete="address-level1"
              />
              <FormField
                name="notes"
                label={t('p2.fields.notes')}
                kind="textarea"
                maxLength={2000}
                hint={t('p2.optional')}
              />
            </div>
            <p className="field-hint">{t('p2.contactPrivacy')}</p>
            <FormActions busy={busy}>{t('p2.requestCall')}</FormActions>
          </form>
        )}
      </Card>
    </section>
  );
}
