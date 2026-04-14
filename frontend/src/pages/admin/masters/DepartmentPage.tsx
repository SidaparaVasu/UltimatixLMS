import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDepartments, useBusinessUnits, ADMIN_QUERY_KEYS } from '@/queries/admin/useAdminMasters';
import { organizationApi, Department } from '@/api/organization-api';
import { useAdminCRUD } from '@/hooks/admin/useAdminCRUD';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableStatusBadge } from '@/components/ui/table';
import { AdminInput, AdminSelect, DialogFooterActions } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';

/* ── Form shape ──────────────────────────────────────────────── */
interface DeptForm {
  department_name: string;
  department_code: string;
  description: string;
  business_unit: number | string;
  parent_department: number | string;
}

const EMPTY_FORM: DeptForm = { 
  department_name: '', 
  department_code: '', 
  description: '', 
  business_unit: '', 
  parent_department: '', 
};

/* ── Tree View Types ────────────────────────────────────────── */
interface TreeRow {
  data: Department;
  depth: number;
  hasChildren: boolean;
}

/* ── Page ────────────────────────────────────────────────────── */
const DepartmentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: deptResponse, isLoading, error } = useDepartments({ page, page_size: pageSize });
  const { data: buResponse } = useBusinessUnits({ page_size: 100 }); // Large page size for dropdown options
  
  const businessUnits = buResponse?.results || [];
  const departments = deptResponse?.results || [];

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Department>) => 
      data.id 
        ? organizationApi.updateDepartment(data.id, data) 
        : organizationApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.departments });
      crud.closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      organizationApi.updateDepartment(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.departments });
    },
  });

  const crud = useAdminCRUD<Department, DeptForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: d => ({ 
      department_name: d.department_name, 
      department_code: d.department_code, 
      description: d.description, 
      business_unit: d.business_unit,
      parent_department: d.parent_department || '',
    }),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  /* ── Tree Expansion Handler ── */
  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Get BU Label ── */
  const getBUName = (buId: number) => businessUnits.find(bu => bu.id === buId)?.business_unit_name || 'Unknown BU';

  /* ── Tree View Logic ── */
  const visibleTreeList = useMemo(() => {
    if (!departments) return [];

    const hasSearch = searchTerm.trim().length > 0;
    const hasStatusFilter = statusFilter !== 'all';

    let workingSet = departments;

    // If filtering or searching, flatten the tree for visibility
    if (hasSearch || hasStatusFilter) {
      workingSet = departments.filter(d => {
        const matchesSearch = !hasSearch || (d.department_name + d.department_code).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !hasStatusFilter || (statusFilter === 'active' ? d.is_active : !d.is_active);
        return matchesSearch && matchesStatus;
      });

      return workingSet.map(d => ({ data: d, depth: 0, hasChildren: false }));
    }

    const map: Record<number | string, Department[]> = {};
    departments.forEach(d => {
      const pId = d.parent_department || 'root';
      if (!map[pId]) map[pId] = [];
      map[pId].push(d);
    });

    const result: TreeRow[] = [];
    const traverse = (parentId: number | string, currentDepth: number) => {
      const children = map[parentId] || [];
      children.forEach(child => {
        const childHasChildren = !!map[child.id] && map[child.id].length > 0;
        result.push({ data: child, depth: currentDepth, hasChildren: childHasChildren });
        if (expandedIds.has(child.id)) {
          traverse(child.id, currentDepth + 1);
        }
      });
    };

    traverse('root', 0);
    return result;
  }, [departments, expandedIds, searchTerm, statusFilter]);

  /* ── Column definitions ──────────────────────────────────────── */
  const columns: DataTableColumn<TreeRow>[] = [
    {
      type: 'custom',
      header: 'Department Name',
      render: (row) => {
        const { data: dept, depth, hasChildren } = row;
        const isExpanded = expandedIds.has(dept.id);
        return (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              paddingLeft: `${depth * 28}px`,
              fontWeight: depth === 0 ? 600 : 400,
              color: 'var(--color-text-primary)'
            }}
          >
            {hasChildren ? (
              <button 
                onClick={(e) => toggleExpand(dept.id, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  marginRight: '6px',
                  borderRadius: '4px',
                }}
              >
                {isExpanded ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
              </button>
            ) : (
              <div style={{ width: '22px', marginRight: '6px' }} />
            )}
            {dept.department_name}
          </div>
        );
      }
    },
    {
      type: 'custom',
      header: 'Code',
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>{row.data.department_code}</span>
    },
    {
      type: 'custom',
      header: 'Business Unit',
      render: (row) => <span style={{ fontSize: '13px' }}>{getBUName(row.data.business_unit)}</span>
    },
    {
      type: 'custom',
      header: 'Status',
      width: '110px',
      render: (row) => (
        <TableStatusBadge variant={row.data.is_active ? 'active' : 'inactive'}>
          {row.data.is_active ? 'Active' : 'Inactive'}
        </TableStatusBadge>
      )
    },
    {
      type: 'actions',
      onEdit: (row) => crud.openDialog(row.data),
      onToggle: (row) => handleToggleStatus(row.data),
      getIsActive: (row) => row.data.is_active
    }
  ];

  /* ── Handlers ── */
  const handleSave = () => {
    saveMutation.mutate({
      ...crud.formData,
      id: crud.editingItem?.id,
      parent_department: crud.formData.parent_department || null,
    } as any);
  };

  const handleToggleStatus = (dept: Department) => {
    toggleMutation.mutate({ id: dept.id, is_active: !dept.is_active });
  };

  const isFormValid = !!(crud.formData.department_name.trim() && crud.formData.department_code.trim() && crud.formData.business_unit);

  return (
    <AdminMasterLayout
      title="Departments"
      description="Organize the company structure using hierarchical departments."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Organization' },
        { label: 'Departments' },
      ]}
      addLabel="Add Department"
      onAdd={() => crud.openDialog()}
      searchPlaceholder="Search Departments..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={deptResponse?.count}
      filterSlot={
        <select
          className="form-input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: '140px', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="all">Status: All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      }
    >
      {/* ── Data Table (Tree View) ── */}
      <AdminDataTable<TreeRow>
        rowKey={(row) => row.data.id}
        columns={columns}
        data={visibleTreeList}
        isLoading={isLoading || toggleMutation.isPending}
        error={error}
        emptyMessage="No departments found on this page."
        skeletonRowCount={5}
        pagination={{
          page,
          pageSize,
          total: deptResponse?.count ?? 0,
          onPageChange: setPage,
        }}
      />

      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? 'Edit Department' : 'Add Department'}
        description="Configure departmental hierarchy and mappings."
        footer={
          <DialogFooterActions
            onCancel={crud.closeDialog}
            onSave={handleSave}
            isEditing={!!crud.editingItem}
            label="Department"
            isSaveDisabled={!isFormValid}
            isLoading={saveMutation.isPending}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AdminInput
            label="Department Code"
            required
            value={crud.formData.department_code}
            onChange={v => crud.setField('department_code', v)}
            placeholder="e.g. DEP-MKT"
          />
          <AdminInput
            label="Department Name"
            required
            value={crud.formData.department_name}
            onChange={v => crud.setField('department_name', v)}
            placeholder="e.g. Marketing"
          />
          <AdminSelect
            label="Business Unit"
            required
            value={String(crud.formData.business_unit)}
            onChange={v => crud.setField('business_unit', v)}
            options={businessUnits.map(bu => ({ label: bu.business_unit_name, value: String(bu.id) }))}
          />
          <AdminSelect
            label="Parent Department"
            value={String(crud.formData.parent_department)}
            onChange={v => crud.setField('parent_department', v)}
            options={departments.filter(d => d.id !== crud.editingItem?.id).map(d => ({ label: d.department_name, value: String(d.id) }))}
            placeholder="None (Top Level)"
          />

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px', resize: 'none' }}
              placeholder="Brief description of functions..."
              value={crud.formData.description}
              onChange={e => crud.setField('description', e.target.value)}
            />
          </div>

          </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default DepartmentPage;
