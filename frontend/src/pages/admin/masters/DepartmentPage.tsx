import React, { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { useDepartments, useBusinessUnits } from '@/queries/admin/useAdminMasters';
import { Department } from '@/api/admin-mock-api';
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

const DepartmentPage: React.FC = () => {
  const { data: departments, isLoading, error } = useDepartments();
  const { data: businessUnits } = useBusinessUnits();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  // Tree State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    businessUnitId: '',
    parentId: '',
    isActive: true
  });

  const handleOpenDialog = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setFormData({ 
        name: dept.name, 
        code: dept.code, 
        description: dept.description, 
        businessUnitId: dept.businessUnitId,
        parentId: dept.parentId || '',
        isActive: dept.isActive 
      });
    } else {
      setEditingDept(null);
      setFormData({ name: '', code: '', description: '', businessUnitId: '', parentId: '', isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    console.log('Saved:', formData);
    setIsDialogOpen(false);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Tree View
  const visibleTreeList = useMemo(() => {
    if (!departments) return [];

    // Filter raw data first based on search & status
    const hasSearch = searchTerm.trim().length > 0;
    const hasStatusFilter = statusFilter !== 'all';

    let workingSet = departments;

    // If searching, we flatten the tree visually and just show matches
    if (hasSearch || hasStatusFilter) {
      workingSet = departments.filter(d => {
        const matchesSearch = !hasSearch || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !hasStatusFilter || (statusFilter === 'active' ? d.isActive : !d.isActive);
        return matchesSearch && matchesStatus;
      });

      // Provide flat array with depth 0
      return workingSet.map(d => ({ data: d, depth: 0, hasChildren: false }));
    }

    // Normal Tree Rendering
    const map: Record<string, Department[]> = {};
    departments.forEach(d => {
      const pId = d.parentId || 'root';
      if (!map[pId]) map[pId] = [];
      map[pId].push(d);
    });

    const result: { data: Department, depth: number, hasChildren: boolean }[] = [];
    
    // Recursive traversal building the flat list of ONLY visible (expanded) nodes
    const traverse = (parentId: string, currentDepth: number) => {
      const children = map[parentId] || [];
      children.forEach(child => {
        const childHasChildren = !!map[child.id] && map[child.id].length > 0;
        result.push({ data: child, depth: currentDepth, hasChildren: childHasChildren });
        
        // If it's expanded, traverse its children
        if (expandedIds.has(child.id)) {
          traverse(child.id, currentDepth + 1);
        }
      });
    };

    traverse('root', 0);
    return result;

  }, [departments, expandedIds, searchTerm, statusFilter]);

  const getBUName = (buId: string) => businessUnits?.find(bu => bu.id === buId)?.name || 'Unknown BU';

  return (
    <div className="content-inner">
      <AdminPageHeader 
        title="Departments"
        description="Organize the company structure using hierarchical departments."
        // icon={Network}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Organization' },
          { label: 'Departments' }
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
            Add Department
          </button>
        }
      />

      <AdminActionBar 
        searchPlaceholder="Search Departments..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        resultCount={visibleTreeList.length}
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

      {/* ── Data Table (Tree View) ── */}
      {isLoading ? (
        <AdminTableSkeleton rowCount={5} columnCount={5} showActionCol />
      ) : error ? (
        <div className="flex justify-center p-8 text-red-500">Failed to load Departments.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Business Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead style={{ textAlign: 'center' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTreeList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>No departments found.</span>
                </TableCell>
              </TableRow>
            ) : (
              visibleTreeList.map((row) => {
                const { data: dept, depth, hasChildren } = row;
                const isExpanded = expandedIds.has(dept.id);
                
                return (
                  <TableRow key={dept.id}>
                    <TableCell>
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
                          <div style={{ width: '22px', marginRight: '6px' }} /> // Spacer when no children
                        )}
                        {dept.name}
                      </div>
                    </TableCell>
                    <TableIdCell>{dept.code}</TableIdCell>
                    <TableCell style={{ fontSize: '13px' }}>{getBUName(dept.businessUnitId)}</TableCell>
                    <TableCell>
                      <TableStatusBadge variant={dept.isActive ? 'active' : 'inactive'}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </TableStatusBadge>
                    </TableCell>
                    <TableActionCell>
                      <TableIconButton 
                        variant="edit" 
                        title="Edit Department" 
                        onClick={() => handleOpenDialog(dept)}
                      />
                    </TableActionCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      {/* ── Add/Edit Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingDept ? "Edit Department" : "Add Department"}
        description="Configure departmental hierarchy and mappings."
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
              {editingDept ? "Update Department" : "Create Department"}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Department Code *</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. DEP-MKT"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Marketing"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Business Unit *</label>
            <select 
              className="form-input" 
              value={formData.businessUnitId}
              onChange={e => setFormData({ ...formData, businessUnitId: e.target.value })}
              style={{ cursor: 'pointer' }}
            >
              <option value="" disabled>Select Business Unit...</option>
              {businessUnits?.map(bu => (
                <option key={bu.id} value={bu.id}>{bu.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Parent Department</label>
            <select 
              className="form-input" 
              value={formData.parentId}
              onChange={e => setFormData({ ...formData, parentId: e.target.value })}
              style={{ cursor: 'pointer' }}
            >
              <option value="">None (Top Level)</option>
              {departments?.filter(d => d.id !== editingDept?.id).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
            <div>
              <label className="form-label" style={{ display: 'block', color: 'var(--color-text-primary)' }}>Active Status</label>
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

export default DepartmentPage;
