import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/api/rbac-api';
import type {
  CreateRolePayload,
  UpdateRolePayload,
  AssignPermissionsPayload,
  AssignUserRolePayload,
} from '@/types/rbac.types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const RBAC_QUERY_KEYS = {
  roles:            ['rbac', 'roles'] as const,
  role:             (id: number) => ['rbac', 'roles', id] as const,
  rolePermissions:  (id: number) => ['rbac', 'roles', id, 'permissions'] as const,
  permissionGroups: ['rbac', 'permission-groups'] as const,
  permissions:      ['rbac', 'permissions'] as const,
  userAssignments:  (userId?: number) => ['rbac', 'user-assignments', userId] as const,
};

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const useRoles = (params?: { page?: number; page_size?: number }) =>
  useQuery({
    queryKey: [...RBAC_QUERY_KEYS.roles, params],
    queryFn: () => rbacApi.getRoles(params),
  });

export const useRole = (id: number) =>
  useQuery({
    queryKey: RBAC_QUERY_KEYS.role(id),
    queryFn: () => rbacApi.getRole(id),
    enabled: !!id,
  });

export const useRolePermissions = (roleId: number) =>
  useQuery({
    queryKey: RBAC_QUERY_KEYS.rolePermissions(roleId),
    queryFn: () => rbacApi.getRolePermissions(roleId),
    enabled: !!roleId,
  });

// ---------------------------------------------------------------------------
// Permission catalog
// ---------------------------------------------------------------------------

export const usePermissionGroups = () =>
  useQuery({
    queryKey: RBAC_QUERY_KEYS.permissionGroups,
    queryFn: () => rbacApi.getPermissionGroups(),
    staleTime: 10 * 60 * 1000, // groups rarely change
  });

export const usePermissions = (params?: { permission_group?: number }) =>
  useQuery({
    queryKey: [...RBAC_QUERY_KEYS.permissions, params],
    queryFn: () => rbacApi.getPermissions(params),
    staleTime: 10 * 60 * 1000,
  });

// ---------------------------------------------------------------------------
// User role assignments
// ---------------------------------------------------------------------------

export const useUserAssignments = (userId?: number) =>
  useQuery({
    queryKey: RBAC_QUERY_KEYS.userAssignments(userId),
    queryFn: () => rbacApi.getUserAssignments(userId ? { user: userId } : undefined),
    enabled: !!userId,
  });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => rbacApi.createRole(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.roles });
    },
  });
};

export const useUpdateRole = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRolePayload) => rbacApi.updateRole(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.roles });
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.role(id) });
    },
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rbacApi.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.roles });
    },
  });
};

export const useAssignPermissions = (roleId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignPermissionsPayload) =>
      rbacApi.assignPermissionsToRole(roleId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.rolePermissions(roleId) });
    },
  });
};

export const useAssignUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignUserRolePayload) => rbacApi.assignUserRole(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.userAssignments(variables.user) });
    },
  });
};

export const useDeactivateUserRole = (userId?: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: number) => rbacApi.deactivateUserRole(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RBAC_QUERY_KEYS.userAssignments(userId) });
    },
  });
};
