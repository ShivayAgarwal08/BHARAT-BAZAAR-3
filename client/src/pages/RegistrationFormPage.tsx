import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { homeFor } from '../services/auth-navigation';
import { api } from '../services/api';
import { ErrorNotice, FormActions, FormField } from '../components/FormControls';
import { Card, Loading } from '../components/ui';
import type { ApiResponse, AuthSession } from '../types';

export function RegistrationFormPage({ role }: { role: 'artisan' | 'student' }) {
  const { t, i18n } = useTranslation();
  const { user, loading, acceptSession } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();
  usePageTitle(t('p2.register.' + role));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = Object.fromEntries(form.entries());
      const { data } = await api.post<ApiResponse<AuthSession>>('/auth/register/' + role, payload);
      acceptSession(data.data);
      await i18n.changeLanguage(data.data.user.preferredLanguage.toLowerCase());
      navigate(homeFor(data.data.user), { replace: true });
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return (
    <section className="container phase2-page narrow-page">
      <p className="eyebrow">{t('p2.accountStep')}</p>
      <h1>{t('p2.register.' + role)}</h1>
      <p className="page-intro">{t('p2.registerIntro')}</p>
      {role === 'artisan' && (
        <Link className="help-link" to="/help-register">
          {t('p2.helpRegister')}
        </Link>
      )}
      <Card className="form-card">
        <form onSubmit={submit} aria-busy={busy}>
          <p className="field-hint">{t('p2.requiredNote')}</p>
          <ErrorNotice error={error} />
          <div className="form-grid">
            <FormField
              name="fullName"
              label={t('p2.fields.fullName')}
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
            />
            <FormField
              name="email"
              label={t('p2.fields.email')}
              type="email"
              required={role === 'student'}
              maxLength={254}
              autoComplete="email"
              hint={role === 'artisan' ? t('p2.optional') : undefined}
            />
            <FormField
              name="phone"
              label={t('p2.fields.phone')}
              type="tel"
              required={role === 'artisan'}
              autoComplete="tel"
              maxLength={25}
              pattern="[+0-9 ()-]{10,25}"
              hint={t('p2.phoneHint')}
            />
            <FormField
              name="password"
              label={t('p2.fields.password')}
              type="password"
              required
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              hint={t('p2.passwordHint')}
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
          </div>
          <FormActions busy={busy}>{t('p2.createAccount')}</FormActions>
        </form>
      </Card>
      <p className="auth-bottom">
        {t('p2.haveAccount')} <Link to="/login">{t('common.login')}</Link>
      </p>
    </section>
  );
}
