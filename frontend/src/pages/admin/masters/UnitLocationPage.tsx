import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { useLocations, ADMIN_QUERY_KEYS } from '@/queries/admin/useAdminMasters';
import { organizationApi } from '@/api/organization-api';
import { Location } from '@/types/org.types';
import { useAdminCRUD } from '@/hooks/admin/useAdminCRUD';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { AdminInput, DialogFooterActions } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';

/* ── Form shape ──────────────────────────────────────────────── */
interface LocationForm {
  location_name: string;
  location_code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

const EMPTY_FORM: LocationForm = { 
  location_name: '', 
  location_code: '', 
  address: '',
  city: '', 
  state: '',
  country: '', 
  postal_code: '',
};

/* ── Column definitions ──────────────────────────────────────── */
const buildColumns = (
  onEdit: (loc: Location) => void,
  onToggleStatus: (loc: Location) => void
): DataTableColumn<Location>[] => [
  { type: 'id',     key: 'location_code', header: 'Location Code', width: '150px' },
  { type: 'text',   key: 'location_name', header: 'Location Name', cellStyle: { fontWeight: 600, color: 'var(--color-text-primary)' } },
  { 
    type: 'custom', 
    header: 'City, Country', 
    render: (loc) => <span>{loc.city}, {loc.country}</span> 
  },
  { type: 'status', key: 'is_active', header: 'Status', width: '110px' },
  { type: 'actions', onEdit, onToggle: onToggleStatus },
];

const LocationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: response, isLoading, error } = useLocations({ page, page_size: pageSize });

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Location>) => 
      data.id 
        ? organizationApi.updateLocation(data.id, data) 
        : organizationApi.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.locations });
      crud.closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      organizationApi.updateLocation(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.locations });
    },
  });

  const crud = useAdminCRUD<Location, LocationForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: loc => ({ 
      location_name: loc.location_name, 
      location_code: loc.location_code, 
      address: loc.address || '',
      city: loc.city, 
      state: loc.state || '',
      country: loc.country, 
      postal_code: loc.postal_code || '',
    }),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /* ── Filtering (Frontend-side on current page) ── */
  const filteredData = response?.results?.filter(loc => {
    const matchesSearch = (loc.location_name + loc.location_code + loc.city).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active') === loc.is_active;
    return matchesSearch && matchesStatus;
  });

  /* ── Handlers ── */
  const handleSave = () => {
    saveMutation.mutate({
      ...crud.formData,
      id: crud.editingItem?.id,
    });
  };

  const handleToggleStatus = (loc: Location) => {
    toggleMutation.mutate({ id: loc.id, is_active: !loc.is_active });
  };

  const isFormValid = !!(
    crud.formData.location_name.trim() && 
    crud.formData.location_code.trim() && 
    crud.formData.city.trim() && 
    crud.formData.country.trim()
  );

  return (
    <AdminMasterLayout
      title="Unit Locations"
      description="Manage physical office locations and remote hubs across the organization."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Organization' },
        { label: 'Unit Locations' },
      ]}
      addLabel="Add Unit Location"
      onAdd={() => crud.openDialog()}
      searchPlaceholder="Search by Location Name, Code, or City..."
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
      <AdminDataTable<Location>
        rowKey="id"
        columns={buildColumns(crud.openDialog, handleToggleStatus)}
        data={filteredData}
        isLoading={isLoading || toggleMutation.isPending}
        error={error}
        emptyMessage="No locations found on this page."
        skeletonRowCount={4}
        pagination={{
          page,
          pageSize,
          total: response?.count ?? 0,
          onPageChange: setPage,
        }}
      />

      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? 'Edit Unit Location' : 'Add Unit Location'}
        description="Provide the geographical details for this company site."
        footer={
          <DialogFooterActions
            onCancel={crud.closeDialog}
            onSave={handleSave}
            isEditing={!!crud.editingItem}
            label="Unit Location"
            isSaveDisabled={!isFormValid}
            isLoading={saveMutation.isPending}
          />
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 'var(--space-4)' }}>
          <div style={{ gridColumn: 'span 1' }}>
            <AdminInput
            label="Unit Location Code"
              required
              value={crud.formData.location_code}
              onChange={v => crud.setField('location_code', v)}
              placeholder="e.g. MUM-BDRA"
            />
          </div>
          <div style={{ gridColumn: 'span 1' }}>
            <AdminInput
            label="Unit Location Name"
              required
              value={crud.formData.location_name}
              onChange={v => crud.setField('location_name', v)}
              placeholder="e.g. Mumbai Office"
            />
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <AdminInput
              label="Address"
              value={crud.formData.address}
              onChange={v => crud.setField('address', v)}
              placeholder="Full street address..."
            />
          </div>

          <AdminInput
            label="City"
            required
            value={crud.formData.city}
            onChange={v => crud.setField('city', v)}
            placeholder="e.g. Mumbai"
          />
          <AdminInput
            label="State / Province"
            value={crud.formData.state}
            onChange={v => crud.setField('state', v)}
            placeholder="e.g. Maharashtra"
          />
          <AdminInput
            label="Country"
            required
            value={crud.formData.country}
            onChange={v => crud.setField('country', v)}
            placeholder="e.g. India"
          />
          <AdminInput
            label="Postal Code"
            value={crud.formData.postal_code}
            onChange={v => crud.setField('postal_code', v)}
            placeholder="e.g. 400050"
          />

        </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default LocationPage;
