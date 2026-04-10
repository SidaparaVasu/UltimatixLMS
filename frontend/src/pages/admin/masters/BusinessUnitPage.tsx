import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBusinessUnits } from '@/queries/admin/useAdminMasters';
import { BusinessUnit } from '@/api/admin-mock-api';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminActionBar } from '@/components/admin/AdminActionBar';
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton';
import { Dialog } from '@/components/ui/dialog';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell,
  TableStatusBadge,
  TableActionCell,
  TableIconButton,
  TableIdCell
} from '@/components/ui/table';

const BusinessUnitPage: React.FC = () => {
  const { data: businessUnits, isLoading, error, refetch } = useBusinessUnits();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBU, setEditingBU] = useState<BusinessUnit | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  const handleOpenDialog = (bu?: BusinessUnit) => {
    if (bu) {
      setEditingBU(bu);
      setFormData({ name: bu.name, code: bu.code, description: bu.description, isActive: bu.isActive });
    } else {
      setEditingBU(null);
      setFormData({ name: '', code: '', description: '', isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // Mock save logic - in a real app, use useMutation here
    console.log('Saved:', formData);
    setIsDialogOpen(false);
  };

  // Filter Data
  const filteredData = businessUnits?.filter(bu => {
    const matchesSearch = 
      bu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bu.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? bu.isActive : !bu.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="content-inner">
      {/* ── Page Header ── */}
      <AdminPageHeader 
        title="Business Units"
        description="Manage the top-level organizational divisions within the company."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Organization' },
          { label: 'Business Units' }
        ]}
        action={
          <button 
            className="btn-primary"
            onClick={() => handleOpenDialog()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-2)',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Add Business Unit
          </button>
        }
      />

      {/* ── Action Bar ── */}
      <AdminActionBar 
        searchPlaceholder="Search by Business Unit Name or Code..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        resultCount={filteredData?.length}
      >
        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          style={{ width: '140px', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </AdminActionBar>

      {/* ── Data Table ── */}
      {isLoading ? (
        <AdminTableSkeleton rowCount={4} columnCount={5} showActionCol />
      ) : error ? (
        <div className="flex justify-center p-8 text-red-500">Failed to load Business Units.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit Code</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead style={{ textAlign: 'center' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>No business units found.</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredData?.map((bu) => (
                <TableRow key={bu.id}>
                  <TableIdCell>{bu.code}</TableIdCell>
                  <TableCell style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{bu.name}</TableCell>
                  <TableCell>{bu.description}</TableCell>
                  <TableCell>
                    <TableStatusBadge variant={bu.isActive ? 'active' : 'inactive'}>
                      {bu.isActive ? 'Active' : 'Inactive'}
                    </TableStatusBadge>
                  </TableCell>
                  <TableActionCell>
                    <TableIconButton 
                      variant="edit" 
                      title="Edit Business Unit" 
                      onClick={() => handleOpenDialog(bu)}
                    />
                  </TableActionCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingBU ? "Edit Business Unit" : "Add Business Unit"}
        description="Enter the details for the business unit below."
        footer={
          <>
            <button 
              className="btn-secondary"
              onClick={() => setIsDialogOpen(false)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--color-text-primary)'
              }}
            >
              Cancel
            </button>
            <button 
              className="btn-primary"
              onClick={handleSave}
              style={{
                background: 'var(--color-accent)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              {editingBU ? "Update Business Unit" : "Create Business Unit"}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Business Unit Code *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. BU-ENG" 
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Business Unit Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Engineering"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              style={{ height: '80px', paddingTop: '8px', resize: 'none' }}
              placeholder="Brief description of functions..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div>
              <label className="form-label" style={{ display: 'block', color: 'var(--color-text-primary)' }}>Active Status</label>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Inactive Business Units will be hidden from normal operations.</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>
      </Dialog>

    </div>
  );
};

export default BusinessUnitPage;
