/**
 * useAllowedViews
 *
 * Returns the set of dashboard views the current user is allowed to see,
 * derived from their RBAC permissions rather than raw role codes.
 *
 * Mapping:
 *   employee  — always available to every authenticated user
 *   manager   — requires EMPLOYEE_VIEW (HR management access)
 *   admin     — requires ROLE_VIEW (system administration access)
 */

import { useMemo } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/constants/permissions';
import type { DashboardView } from '@/stores/uiStore';

export const useAllowedViews = (): DashboardView[] => {
  const canViewEmployees = usePermission(PERMISSIONS.EMPLOYEE_VIEW);
  const canViewRoles     = usePermission(PERMISSIONS.ROLE_VIEW);

  return useMemo(() => {
    const views: DashboardView[] = ['employee'];
    if (canViewEmployees) views.push('manager');
    if (canViewRoles) views.push('admin');
    return views;
  }, [canViewEmployees, canViewRoles]);
};
