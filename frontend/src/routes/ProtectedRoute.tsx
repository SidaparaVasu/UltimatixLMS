import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';

interface ProtectedRouteProps {
  permission?: string;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  permission,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasPermission = usePermission(permission ?? '');

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (permission && !hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
