import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { useBusinessUnits, ADMIN_QUERY_KEYS } from '@/queries/admin/useAdminMasters';
import { organizationApi, BusinessUnit } from '@/api/organization-api';
import { useAdminCRUD } from '@/hooks/admin/useAdminCRUD';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { AdminInput, DialogFooterActions } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';

/* ── Form shape ──────────────────────────────────────────────── */
interface BUForm {
  business_unit_name: string;
  business_unit_code: string;
  description: string;
}

const EMPTY_FORM: BUForm = { 
  business_unit_name: '', 
  business_unit_code: '', 
  description: '', 
};

/* ── Column definitions ──────────────────────────────────────── */
const buildColumns = (
  onEdit: (bu: BusinessUnit) => void,
  onToggleStatus: (bu: BusinessUnit) => void
): DataTableColumn<BusinessUnit>[] => [
  { type: 'id',     key: 'business_unit_code', header: 'Unit Code', width: '130px' },
  { type: 'text',   key: 'business_unit_name', header: 'Business Unit', cellStyle: { fontWeight: 600, color: 'var(--color-text-primary)' } },
  { type: 'text',   key: 'description',        header: 'Description' },
  { type: 'status', key: 'is_active',          header: 'Status', width: '110px' },
  { type: 'actions', onEdit, onToggle: onToggleStatus },
];

/* ── Page ────────────────────────────────────────────────────── */
const BusinessUnitPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: response, isLoading, error } = useBusinessUnits({ page, page_size: pageSize });

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (data: Partial<BusinessUnit>) => 
      data.id 
        ? organizationApi.updateBusinessUnit(data.id, data) 
        : organizationApi.createBusinessUnit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.businessUnits });
      crud.closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      organizationApi.updateBusinessUnit(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.businessUnits });
    },
  });

  const crud = useAdminCRUD<BusinessUnit, BUForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: bu => ({ 
      business_unit_name: bu.business_unit_name, 
      business_unit_code: bu.business_unit_code, 
      description: bu.description, 
    }),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /* ── Filtering (Frontend-side on current page) ── */
  const filteredData = response?.results?.filter(bu => {
    const matchesSearch = (bu.business_unit_name + bu.business_unit_code).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active') === bu.is_active;
    return matchesSearch && matchesStatus;
  });

  /* ── Handlers ── */
  const handleSave = () => {
    saveMutation.mutate({
      ...crud.formData,
      id: crud.editingItem?.id,
    });
  };

  const handleToggleStatus = (bu: BusinessUnit) => {
    toggleMutation.mutate({ id: bu.id, is_active: !bu.is_active });
  };

  const isFormValid = !!(crud.formData.business_unit_name.trim() && crud.formData.business_unit_code.trim());

  return (
    <AdminMasterLayout
      title="Business Units"
      description="Manage the top-level organizational divisions within the company."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Organization' },
        { label: 'Business Units' },
      ]}
      addLabel="Add Business Unit"
      onAdd={() => crud.openDialog()}
      searchPlaceholder="Search on this page..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={response?.count}
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
      {/* ── Data Table ── */}
      <AdminDataTable<BusinessUnit>
        rowKey="id"
        columns={buildColumns(crud.openDialog, handleToggleStatus)}
        data={filteredData}
        isLoading={isLoading || toggleMutation.isPending}
        error={error}
        emptyMessage="No business units found on this page."
        skeletonRowCount={4}
        pagination={{
          page,
          pageSize,
          total: response?.count ?? 0,
          onPageChange: setPage,
        }}
      />

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? 'Edit Business Unit' : 'Add Business Unit'}
        description="Enter the details for the business unit below."
        footer={
          <DialogFooterActions
            onCancel={crud.closeDialog}
            onSave={handleSave}
            isEditing={!!crud.editingItem}
            label="Business Unit"
            isSaveDisabled={!isFormValid}
            isLoading={saveMutation.isPending}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AdminInput
            label="Business Unit Code"
            required
            value={crud.formData.business_unit_code}
            onChange={v => crud.setField('business_unit_code', v)}
            placeholder="e.g. BU-ENG"
          />
          <AdminInput
            label="Business Unit Name"
            required
            value={crud.formData.business_unit_name}
            onChange={v => crud.setField('business_unit_name', v)}
            placeholder="e.g. Engineering"
          />
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px', resize: 'none' }}
              placeholder="Brief description of this unit's functions..."
              value={crud.formData.description}
              onChange={e => crud.setField('description', e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default BusinessUnitPage;
