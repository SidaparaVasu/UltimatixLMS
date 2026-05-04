import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Pencil,
  Trash2,
  ChevronLeft,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@/constants/permissions';
import {
  useRole,
  useRolePermissions,
  usePermissions,
  usePermissionGroups,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissions,
} from '@/queries/admin/useRbacQueries';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminInput } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';
import type { Permission } from '@/types/rbac.types';

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3
    style={{
      margin: '0 0 var(--space-4)',
      fontSize: '13px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--color-text-muted)',
    }}
  >
    {children}
  </h3>
);

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      ...style,
    }}
  >
    {children}
  </div>
);

const PermissionChip: React.FC<{
  permission: Permission;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}> = ({ permission, checked, disabled, onChange }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '6px 10px',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
      background: checked ? 'var(--color-accent-subtle)' : 'var(--color-surface-alt)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 120ms ease',
      userSelect: 'none',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      style={{ display: 'none' }}
    />
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${checked ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
        background: checked ? 'var(--color-accent)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 120ms ease',
      }}
    >
      {checked && <Check size={10} strokeWidth={3} color="#fff" />}
    </div>
    <span
      style={{
        fontSize: '12px',
        fontWeight: checked ? 600 : 400,
        color: checked ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {permission.permission_code}
    </span>
  </label>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const RoleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const roleId = Number(id);
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const canUpdate = usePermission(PERMISSIONS.ROLE_UPDATE);
  const canDelete = usePermission(PERMISSIONS.ROLE_DELETE);

  // ── Data fetching ──
  const { data: role, isLoading: roleLoading } = useRole(roleId);
  const { data: rolePerms, isLoading: permsLoading } = useRolePermissions(roleId);
  const { data: allPermsRes } = usePermissions();
  const { data: groupsRes } = usePermissionGroups();

  const updateRole = useUpdateRole(roleId);
  const deleteRole = useDeleteRole();
  const assignPerms = useAssignPermissions(roleId);

  // ── Edit state ──
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete confirm state ──
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // ── Permission assignment state ──
  // selectedIds: the working set of permission IDs the user is editing
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [permsDirty, setPermsDirty] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);

  // Initialise selectedIds from the role's current permissions when data arrives
  const currentPermIds = useMemo(
    () => new Set((rolePerms ?? []).map((p) => p.id)),
    [rolePerms],
  );

  // Reset working set when role permissions load or role changes
  React.useEffect(() => {
    setSelectedIds(new Set(currentPermIds));
    setPermsDirty(false);
  }, [currentPermIds]);

  // ── Derived data ──
  const allPerms: Permission[] = allPermsRes?.results ?? [];
  const groups = groupsRes?.results ?? [];

  // Permissions the requesting user personally holds — used for privilege escalation prevention
  const myPermCodes = useMemo(
    () => new Set(Object.keys(user?.permissions ?? {})),
    [user],
  );

  // Group all permissions by their group_code
  const permsByGroup = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPerms) {
      const existing = map.get(p.group_code) ?? [];
      existing.push(p);
      map.set(p.group_code, existing);
    }
    return map;
  }, [allPerms]);

  const isReadOnly = !role || role.is_system_role;
  const canEditPerms = canUpdate && !isReadOnly;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const openEdit = () => {
    if (!role) return;
    setEditName(role.role_name);
    setEditDesc(role.description ?? '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    setEditError(null);
    try {
      const result = await updateRole.mutateAsync({
        role_name: editName.trim(),
        description: editDesc.trim(),
      });
      if (result) setIsEditOpen(false);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to update role.');
    }
  };

  const handleDelete = async () => {
    try {
      const ok = await deleteRole.mutateAsync(roleId);
      if (ok) navigate('/admin/roles');
    } catch {
      // handleApiError already shows a toast
    }
  };

  const togglePermission = (permId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permId);
      else next.delete(permId);
      return next;
    });
    setPermsDirty(true);
    setPermsError(null);
  };

  const handleSavePermissions = async () => {
    setPermsError(null);
    try {
      const ok = await assignPerms.mutateAsync({
        permission_ids: Array.from(selectedIds),
      });
      if (ok !== false) setPermsDirty(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Permission denied. You may be trying to grant permissions you do not hold.';
      setPermsError(msg);
    }
  };

  const handleDiscardPermissions = () => {
    setSelectedIds(new Set(currentPermIds));
    setPermsDirty(false);
    setPermsError(null);
  };

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  if (roleLoading || permsLoading) {
    return (
      <div className="content-inner">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
          }}
        >
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
      </div>
    );
  }

  if (!role) {
    return (
      <div className="content-inner">
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Role not found.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="content-inner">
      {/* ── Page Header ── */}
      <AdminPageHeader
        title={role.role_name}
        description={role.description || undefined}
        // icon={ShieldCheck}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Roles', href: '/admin/roles' },
          { label: role.role_name },
        ]}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {/* Back */}
            <button
              onClick={() => navigate('/admin/roles')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ChevronLeft size={15} />
              Back
            </button>

            {/* Edit — only for custom roles */}
            {canUpdate && !isReadOnly && (
              <button
                onClick={openEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}

            {/* Delete — only for custom roles */}
            {canDelete && !isReadOnly && (
              <button
                onClick={() => setIsDeleteOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-danger)',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--color-danger)',
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        }
      />

      {/* ── Meta row ── */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Type badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            background: role.is_system_role
              ? 'var(--color-accent-subtle)'
              : 'var(--color-surface-alt)',
            color: role.is_system_role
              ? 'var(--color-accent)'
              : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {role.is_system_role && <Lock size={11} strokeWidth={2.5} />}
          {role.is_system_role ? 'System Role' : 'Custom Role'}
        </span>

        {/* Status badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            background: role.is_active
              ? 'color-mix(in srgb, var(--success) 12%, transparent)'
              : 'var(--color-surface-alt)',
            color: role.is_active ? 'var(--success)' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
        >
          {role.is_active ? 'Active' : 'Inactive'}
        </span>

        {/* Code badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono, monospace)',
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {role.role_code}
        </span>
      </div>

      {/* ── System role notice ── */}
      {isReadOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-subtle)',
            border: '1px solid var(--color-accent)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent)',
          }}
        >
          <Lock size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
          System roles are managed by the platform and cannot be modified.
        </div>
      )}

      {/* ── Permissions section ── */}
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <SectionTitle>Permissions</SectionTitle>

          {/* Save / Discard controls — only shown when editing */}
          {canEditPerms && permsDirty && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={handleDiscardPermissions}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <X size={13} />
                Discard
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={assignPerms.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--color-accent)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: assignPerms.isPending ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  opacity: assignPerms.isPending ? 0.7 : 1,
                }}
              >
                <Check size={13} />
                {assignPerms.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Privilege escalation error */}
        {permsError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)',
              border: '1px solid var(--color-danger)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-danger)',
            }}
          >
            <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            {permsError}
          </div>
        )}

        {/* Permission groups */}
        {groups.length === 0 && allPerms.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Loading permissions…
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {groups
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((group) => {
                const groupPerms = permsByGroup.get(group.group_code) ?? [];
                if (groupPerms.length === 0) return null;

                return (
                  <div key={group.id}>
                    {/* Group header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {group.group_name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-muted)',
                          background: 'var(--color-surface-alt)',
                          padding: '1px 7px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {groupPerms.filter((p) => selectedIds.has(p.id)).length} /{' '}
                        {groupPerms.length}
                      </span>
                    </div>

                    {/* Permission chips */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-2)',
                      }}
                    >
                      {groupPerms.map((perm) => {
                        const checked = selectedIds.has(perm.id);
                        // Privilege escalation prevention: disable if the requesting
                        // user doesn't hold this permission themselves (UI layer only;
                        // backend enforces this too).
                        const callerLacksIt =
                          canEditPerms && !myPermCodes.has(perm.permission_code);
                        const disabled = isReadOnly || !canEditPerms || callerLacksIt;

                        return (
                          <PermissionChip
                            key={perm.id}
                            permission={perm}
                            checked={checked}
                            disabled={disabled}
                            onChange={(c) => togglePermission(perm.id, c)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* ── Edit Role Dialog ── */}
      <Dialog
        open={isEditOpen}
        onOpenChange={() => setIsEditOpen(false)}
        title="Edit Role"
        description="Update the role name or description."
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditOpen(false)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={!editName.trim() || updateRole.isPending}
              style={{
                background: editName.trim() ? 'var(--color-accent)' : 'var(--color-text-muted)',
                opacity: !editName.trim() || updateRole.isPending ? 0.6 : 1,
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: !editName.trim() || updateRole.isPending ? 'not-allowed' : 'pointer',
                color: '#fff',
              }}
            >
              {updateRole.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AdminInput
            label="Role Name"
            required
            value={editName}
            onChange={setEditName}
          />
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px', resize: 'none' }}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          {editError && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
              {editError}
            </p>
          )}
        </div>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={() => setIsDeleteOpen(false)}
        title="Delete Role"
        description={`Are you sure you want to delete "${role.role_name}"? This action cannot be undone.`}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsDeleteOpen(false)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteRole.isPending}
              style={{
                background: 'var(--color-danger)',
                opacity: deleteRole.isPending ? 0.6 : 1,
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: deleteRole.isPending ? 'not-allowed' : 'pointer',
                color: '#fff',
              }}
            >
              {deleteRole.isPending ? 'Deleting…' : 'Delete Role'}
            </button>
          </div>
        }
      >
        {/* Empty body — description in the dialog header is sufficient */}
        <div />
      </Dialog>
    </div>
  );
};

export default RoleDetailPage;
