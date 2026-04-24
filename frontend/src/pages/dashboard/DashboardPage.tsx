import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore, type DashboardView } from '@/stores/uiStore';

const EmployeeDashboard = lazy(() => import('./EmployeeDashboard'));
const ManagerDashboard = lazy(() => import('./ManagerDashboard'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

const ADMIN_ROLES = ['LMS_ADMIN'];
const HR_ROLES = ['HR'];

/** Returns the set of dashboard views this user is allowed to see */
export const getAllowedViews = (roleCodes: string[]): DashboardView[] => {
  const views: DashboardView[] = ['employee'];
  if (roleCodes.some((c) => HR_ROLES.includes(c))) views.push('manager');
  if (roleCodes.some((c) => ADMIN_ROLES.includes(c))) views.push('admin');
  return views;
};

const DashboardLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { activeDashboardView, setDashboardView } = useUIStore();

  const roleCodes = user?.roles?.map((r) => r.role_code) ?? [];
  const allowedViews = getAllowedViews(roleCodes);

  // If the persisted view is no longer allowed (e.g. role changed), fall back to employee
  useEffect(() => {
    if (!allowedViews.includes(activeDashboardView)) {
      setDashboardView('employee');
    }
  }, [activeDashboardView, allowedViews, setDashboardView]);

  const view = allowedViews.includes(activeDashboardView) ? activeDashboardView : 'employee';

  return (
    <Suspense fallback={<DashboardLoader />}>
      {view === 'admin' ? (
        <AdminDashboard />
      ) : view === 'manager' ? (
        <ManagerDashboard />
      ) : (
        <EmployeeDashboard />
      )}
    </Suspense>
  );
};

export default DashboardPage;
