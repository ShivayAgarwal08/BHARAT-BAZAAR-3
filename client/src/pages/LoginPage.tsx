import { ArrowRight, Eye, GraduationCap, HandHeart, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Role } from '../types';

const roles: Role[] = ['artisan', 'student', 'admin'];

export function LoginPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const requestedRole = params.get('role');
  const [role, setRole] = useState<Role>(roles.find((item) => item === requestedRole) || 'artisan');
  const { enterPreview } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle(t('common.login'));

  function openPreview(event: FormEvent) {
    event.preventDefault();
    enterPreview(role);
    const base = `/dashboard/${role}`;
    const from: unknown = (location.state as { from?: unknown } | null)?.from;
    const destination =
      typeof from === 'string' && (from === base || from.startsWith(`${base}/`)) ? from : base;
    navigate(destination, { replace: true });
  }

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
        <h2>{t('auth.loginTitle')}</h2>
        <p>{t('auth.loginText')}</p>
        <div className="preview-notice">
          <Eye size={20} aria-hidden="true" />
          <div>
            <strong>{t('auth.demoTitle')}</strong>
            <p>{t('auth.demoText')}</p>
          </div>
        </div>
        <form onSubmit={openPreview}>
          <div className="login-fields">
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="off"
              disabled
              placeholder={t('auth.emailPlaceholder')}
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="off"
              disabled
              placeholder={t('auth.passwordPlaceholder')}
            />
          </div>
          <fieldset className="role-picker">
            <legend>{t('auth.roleLabel')}</legend>
            {roles.map((item) => {
              const Icon =
                item === 'artisan' ? HandHeart : item === 'student' ? GraduationCap : ShieldCheck;
              return (
                <label
                  className={role === item ? 'role-option selected' : 'role-option'}
                  key={item}
                >
                  <input
                    type="radio"
                    name="role"
                    value={item}
                    checked={role === item}
                    onChange={() => setRole(item)}
                  />
                  <Icon size={19} aria-hidden="true" />
                  <span>{t(`common.${item}`)}</span>
                </label>
              );
            })}
          </fieldset>
          {role === 'admin' && <p className="disclaimer">{t('auth.adminNote')}</p>}
          <Button type="submit" className="w-full">
            {t('auth.openDemo')}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </form>
        <p className="auth-bottom">
          {t('auth.notMember')} <Link to="/register">{t('auth.chooseRole')}</Link>
        </p>
      </div>
    </section>
  );
}
