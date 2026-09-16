import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { routeRole } from '../services/auth-navigation';
import { Loading, Button } from '../components/ui';
import { ErrorNotice } from '../components/FormControls';
import type { Role } from '../types';

export function ProtectedRoute({
  role,
  allowIncomplete = false,
}: {
  role: Role;
  allowIncomplete?: boolean;
}) {
  const { user, loading, sessionError } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  if (loading) return <Loading />;
  if (sessionError)
    return (
      <main className="container phase2-page">
        <ErrorNotice error={sessionError} />
        <Button onClick={() => window.location.reload()}>{t('p2.retry')}</Button>
      </main>
    );
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (routeRole(user) !== role) return <Navigate to="/unauthorized" replace />;
  if (!allowIncomplete && role !== 'admin' && !user.onboardingCompleted)
    return <Navigate to={'/onboarding/' + role} replace />;
  return <Outlet />;
}
