import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

export function ProtectedRoute({ role }: { role: Role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return <Navigate to={`/login?role=${role}`} state={{ from: location.pathname }} replace />;
  if (user.role !== role) return <Navigate to={`/dashboard/${user.role}`} replace />;
  // UI demonstration only. Future API endpoints must independently enforce authorization.
  return <Outlet />;
}
