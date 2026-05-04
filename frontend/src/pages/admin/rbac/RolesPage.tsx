import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, Lock } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/constants/permissions';
import { useRoles, useCreateRole } from '@/queries/admin/useRbacQueries';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { AdminInput } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';
import type { Role, CreateRolePayload } from '@/types/rbac.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RoleTypeBadge: React.FC<{ isSystem: boolean }> = ({ isSystem }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      background: isSystem ? 'var(--color-accent-subtle)' : 'var(--color-surface-alt)',
      color: isSystem ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    }}
  >
    {isSystem && <Lock size={10} strokeWidth={2.5} />}
    {isSystem ? 'System' : 'Custom'}
  </span>
);

// ---------------------------------------------------------------------------
// Create Role form shape
// ---------------------------------------------------------------------------

interface RoleForm {
  role_name: string;
  role_code: string;
  description: string;
}

const EMPTY_FORM: RoleForm = { role_name: '', role_code: '', description: '' };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const canCreate = usePermission(PERMISSIONS.ROLE_CREATE);

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RoleForm>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);

  const pageSize = 20;
  const { data: rolesRes, isLoading, error } = useRoles({ page, page_size: pageSize });
  const createRole = useCreateRole();

  const allRoles = rolesRes?.results ?? [];

  // Client-side filter on the current page
  const filteredRoles = allRoles.filter((role) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      role.role_name.toLowerCase().includes(q) ||
      role.role_code.toLowerCase().includes(q);
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'system') === role.is_system_role;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active') === role.is_active;
    return matchesSearch && matchesType && matchesStatus;
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const setField = <K extends keyof RoleForm>(k: K, v: RoleForm[K]) =>
    setFormData((prev) => ({ ...prev, [k]: v }));

  const openDialog = () => {
    setFormData({ ...EMPTY_FORM });
    setFormError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setFormData({ ...EMPTY_FORM });
      setFormError(null);
    }, 200);
  };

  const handleCreate = async () => {
    setFormError(null);
    const payload: CreateRolePayload = {
      role_name: formData.role_name.trim(),
      role_code: formData.role_code.trim().toUpperCase(),
      description: formData.description.trim(),
    };
    try {
      const result = await createRole.mutateAsync(payload);
      if (result) {
        closeDialog();
        navigate(`/admin/roles/${result.id}`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.role_code?.[0] ||
        'Failed to create role.';
      setFormError(msg);
    }
  };

  const isFormValid = !!(formData.role_name.trim() && formData.role_code.trim());

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const columns: DataTableColumn<Role>[] = [
    {
      type: 'id',
      key: 'role_code',
      header: 'Code',
      width: '160px',
    },
    {
      type: 'custom',
      header: 'Role Name',
      cellStyle: { fontWeight: 600, color: 'var(--color-text-primary)' },
      render: (role) => (
        <button
          onClick={() => navigate(`/admin/roles/${role.id}`)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-accent)',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          {role.role_name}
        </button>
      ),
    },
    {
      type: 'custom',
      header: 'Type',
      width: '110px',
      render: (role) => <RoleTypeBadge isSystem={role.is_system_role} />,
    },
    {
      type: 'text',
      key: 'description',
      header: 'Description',
    },
    {
      type: 'status',
      key: 'is_active',
      header: 'Status',
      width: '100px',
    },
    {
      type: 'actions',
      onView: (role) => navigate(`/admin/roles/${role.id}`),
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AdminMasterLayout
      title="Roles"
      description="Manage system and custom roles. Custom roles are scoped to your company."
    //   icon={ShieldCheck}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'System' },
        { label: 'Roles' },
      ]}
      addLabel={canCreate ? 'Create Role' : undefined}
      onAdd={canCreate ? openDialog : undefined}
      searchPlaceholder="Search by name or code..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={filteredRoles.length}
      filterSlot={
        <>
          <select
            className="form-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            style={{ width: '130px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="all">Type: All</option>
            <option value="system">System</option>
            <option value="custom">Custom</option>
          </select>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{ width: '130px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </>
      }
    >
      {/* ── Table ── */}
      <AdminDataTable<Role>
        rowKey="id"
        columns={columns}
        data={filteredRoles}
        isLoading={isLoading}
        error={error}
        emptyMessage="No roles found."
        skeletonRowCount={6}
        pagination={{
          page,
          pageSize,
          total: rolesRes?.count ?? 0,
          onPageChange: setPage,
        }}
      />

      {/* ── Create Role Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        title="Create Custom Role"
        description="Custom roles are scoped to your company and cannot be system roles."
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button
              onClick={closeDialog}
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
              onClick={handleCreate}
              disabled={!isFormValid || createRole.isPending}
              style={{
                background: isFormValid ? 'var(--color-accent)' : 'var(--color-text-muted)',
                opacity: !isFormValid || createRole.isPending ? 0.6 : 1,
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: !isFormValid || createRole.isPending ? 'not-allowed' : 'pointer',
                color: '#fff',
              }}
            >
              {createRole.isPending ? 'Creating…' : 'Create Role'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AdminInput
            label="Role Name"
            required
            value={formData.role_name}
            onChange={(v) => setField('role_name', v)}
            placeholder="e.g. Content Reviewer"
          />
          <AdminInput
            label="Role Code"
            required
            value={formData.role_code}
            onChange={(v) => setField('role_code', v.toUpperCase())}
            placeholder="e.g. CONTENT_REVIEWER"
          />
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px', resize: 'none' }}
              placeholder="Brief description of this role's purpose..."
              value={formData.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          {formError && (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-danger)',
              }}
            >
              {formError}
            </p>
          )}
        </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default RolesPage;
