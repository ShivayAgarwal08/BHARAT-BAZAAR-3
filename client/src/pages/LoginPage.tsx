import { HandHeart, GraduationCap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { api } from '../services/api';
import { homeFor, routeRole } from '../services/auth-navigation';
import { ErrorNotice, FormField, FormActions } from '../components/FormControls';
import { Loading } from '../components/ui';
import type { ApiResponse, AuthSession } from '../types';

export function LoginPage() {
  const { t } = useTranslation();
  const { user, loading, acceptSession } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const navigate = useNavigate(),
    location = useLocation();
  usePageTitle(t('common.login'));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    try {
      const { data } = await api.post<ApiResponse<AuthSession>>('/auth/login', {
        identifier: fields.get('identifier'),
        password: fields.get('password'),
      });
      acceptSession(data.data);
      const base = '/dashboard/' + routeRole(data.data.user);
      const from: unknown = (location.state as { from?: unknown } | null)?.from;
      const destination =
        data.data.user.onboardingCompleted &&
        typeof from === 'string' &&
        (from === base || from.startsWith(base + '/'))
          ? from
          : homeFor(data.data.user);
      navigate(destination, { replace: true });
    } catch (problem) {
      setError(problem);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return (
    <section className="auth-section container">
      <div className="auth-story">
        <p className="eyebrow">{t('auth.eyebrow')}</p>
        <h1>{t('auth.title')}</h1>
        <p>{t('auth.subtitle')}</p>
        <div className="auth-art" aria-hidden="true">
          <div className="auth-orbit">
            <HandHeart size={42} strokeWidth={1} />
            <span>✳</span>
            <GraduationCap size={44} strokeWidth={1} />
          </div>
          <div className="auth-art-line" />
          <span className="auth-art-caption">{t('landing.heroNote')}</span>
        </div>
      </div>
      <div className="login-card">
        <h2>{t('common.login')}</h2>
        <p>{t('p2.loginIntro')}</p>
        <form onSubmit={submit} aria-busy={busy}>
          <ErrorNotice error={error} />
          <div className="login-fields">
            <FormField
              name="identifier"
              label={t('p2.fields.identifier')}
              required
              autoComplete="username"
              maxLength={254}
            />
            <FormField
              name="password"
              label={t('p2.fields.password')}
              type="password"
              required
              autoComplete="current-password"
              maxLength={200}
            />
          </div>
          <FormActions busy={busy}>{t('common.login')}</FormActions>
        </form>
        <p className="auth-bottom">
          {t('auth.notMember')} <Link to="/register">{t('auth.chooseRole')}</Link>
        </p>
        <Link className="help-link" to="/help-register">
          {t('p2.helpRegister')}
        </Link>
      </div>
    </section>
  );
}
