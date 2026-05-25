import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import { getAccessToken } from '@/api/token-storage';

interface ProtectedRouteProps {
  permission?: string;
  redirectTo?: string;
}

export const ProtectedRoute = ({
  permission,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasPermission = usePermission(permission ?? '');

  useEffect(() => {
    if (hydrated) return;
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  // Persist can say authenticated while tokens were cleared (e.g. failed refresh).
  const accessToken = getAccessToken();
  if (!isAuthenticated || !accessToken) {
    if (isAuthenticated && !accessToken) {
      useAuthStore.getState().clearAuth();
    }
    return <Navigate to={redirectTo} replace />;
  }

  if (permission && !hasPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
