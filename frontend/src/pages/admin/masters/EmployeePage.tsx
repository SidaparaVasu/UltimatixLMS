import React, { useState, useMemo } from 'react';
import { Plus, ChevronRight, ChevronLeft, User, Building2, Network, Check } from 'lucide-react';
import { useEmployees, useDepartments, useJobRoles, useBusinessUnits, useLocations } from '@/queries/admin/useAdminMasters';
import { Employee } from '@/api/admin-mock-api';
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
  TableProfileCell,
  TableIdCell
} from '@/components/ui/table';

const EmployeePage: React.FC = () => {
  const { data: employees, isLoading, error } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: jobRoles } = useJobRoles();
  const { data: businessUnits } = useBusinessUnits();
  const { data: locations } = useLocations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile_no: '',
    profile_image: '',
    date_of_birth: '',
    gender: '',
    employeeCode: '',
    company: 'Ultimatix Global', // Read-only standard for now
    businessUnitId: '',
    departmentId: '',
    roleId: '',
    locationId: '',
    managerId: '',
    joiningDate: '',
    isActive: true
  });

  const handleOpenDialog = (emp?: Employee) => {
    setCurrentStep(1); // Reset to first step
    if (emp) {
      setEditingEmp(emp);
      setFormData({ 
        username: (emp as any).username || '',
        password: '',
        firstName: emp.firstName, 
        lastName: emp.lastName, 
        email: emp.email,
        mobile_no: emp.mobile_no || '', 
        profile_image: (emp as any).profile_image || '',
        date_of_birth: (emp as any).date_of_birth || '',
        gender: (emp as any).gender || '',
        employeeCode: emp.employeeCode, 
        company: 'Ultimatix Global',
        businessUnitId: (emp as any).businessUnitId || '',
        departmentId: emp.departmentId, 
        roleId: emp.roleId, 
        locationId: (emp as any).locationId || '',
        joiningDate: (emp as any).joiningDate || '',
        managerId: emp.managerId || '', 
        isActive: emp.isActive 
      });
    } else {
      setEditingEmp(null);
      setFormData({ 
        username: '', password: '', firstName: '', lastName: '', email: '', mobile_no: '', profile_image: '', date_of_birth: '', gender: '',
        employeeCode: '', company: 'Ultimatix Global', businessUnitId: '', departmentId: '', roleId: '', locationId: '', joiningDate: '', managerId: '', isActive: true 
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    console.log('Saved:', formData);
    setIsDialogOpen(false);
  };

  // Filter Data combining text search and status
  const filteredData = employees?.filter(emp => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? emp.isActive : !emp.isActive);
    return matchesSearch && matchesStatus;
  });

  const getDeptName = (id: string) => departments?.find(d => d.id === id)?.name || '-';
  const getRoleName = (id: string) => jobRoles?.find(r => r.id === id)?.name || '-';
  const getManagerName = (id: string) => {
    if (!id) return '-';
    const m = employees?.find(e => e.id === id);
    return m ? `${m.firstName} ${m.lastName}` : '-';
  };

  const isStep1Valid = !!(
    formData.username.trim() && 
    (editingEmp || formData.password.trim()) && 
    formData.firstName.trim() && 
    formData.lastName.trim() && 
    formData.email.trim() && 
    formData.mobile_no.trim()
  );

  const isStep2Valid = !!(
    formData.employeeCode.trim() && 
    formData.locationId && 
    formData.businessUnitId && 
    formData.departmentId && 
    formData.roleId
  );

  const isAllValid = isStep1Valid && isStep2Valid;
  const isPrimaryBtnDisabled = currentStep === 3 && !isAllValid;

  // Render helpers for multi-step modal
  const renderStepIndicators = () => (
    <div style={{ 
      display: 'flex', 
      width: 'calc(100% + var(--space-6) * 2)',
      margin: 'calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) var(--space-6) calc(-1 * var(--space-6))',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      position: 'sticky',
      top: 'calc(-1 * var(--space-6))',
      zIndex: 10
    }}>
      {[
        { step: 1, label: 'Basic Information', icon: <User size={16} /> },
        { step: 2, label: 'Company Information', icon: <Building2 size={16} /> },
        { step: 3, label: 'Reporting', icon: <Network size={16} /> }
      ].map(s => {
        const isStepValid = s.step === 1 ? isStep1Valid : s.step === 2 ? isStep2Valid : true;
        const isCompleted = isStepValid;
        const isActive = currentStep === s.step;
        
        let colorObj = {
          main: 'var(--color-text-muted)',
          bg: 'transparent',
          circleBg: '#f1f5f9',
          circleText: '#94a3b8',
          border: 'transparent'
        };

        if (isCompleted) {
          colorObj = {
            main: 'var(--success)',
            bg: 'transparent',
            circleBg: 'var(--success)',
            circleText: '#fff',
            border: 'var(--success)'
          };
        } else if (isActive) {
          colorObj = {
            main: '#3b82f6',
            bg: '#eff6ff',
            circleBg: '#3b82f6',
            circleText: '#fff',
            border: '#3b82f6'
          };
        }

        return (
          <div 
            key={s.step}
            style={{ 
              flex: 1, 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px 8px',
              background: colorObj.bg,
              cursor: 'pointer',
              borderBottom: `2px solid ${colorObj.border}`,
              transition: 'all 0.2s',
              color: colorObj.main
            }}
            onClick={() => setCurrentStep(s.step)}
          >
            <div style={{ 
              width: '24px', height: '24px', borderRadius: '50%', 
              background: colorObj.circleBg, 
              color: colorObj.circleText, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '12px', fontWeight: 'bold' 
            }}>
              {isCompleted ? <Check size={14} strokeWidth={3} /> : s.step}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
               {s.icon}
               <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500 }}>
                 {s.label}
               </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="content-inner">
      <AdminPageHeader 
        title="Employee Directory"
        description="A unified manifest of all personnel and their corporate reporting lines."
        // icon={Users2}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Workforce' },
          { label: 'Employees' }
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
            Add Employee
          </button>
        }
      />

      <AdminActionBar 
        searchPlaceholder="Search by Name, Code, or Email..."
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
        <AdminTableSkeleton rowCount={5} columnCount={6} showActionCol />
      ) : error ? (
        <div className="flex justify-center p-8 text-red-500">Failed to load Employees.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp Code</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead style={{ textAlign: 'center' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>No employees found.</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredData?.map((emp) => (
                <TableRow key={emp.id}>
                  <TableIdCell>{emp.employeeCode}</TableIdCell>
                  <TableCell>
                    <TableProfileCell 
                        name={`${emp.firstName} ${emp.lastName}`}
                        sub={emp.email}
                    />
                  </TableCell>
                  <TableCell style={{ fontSize: '13px' }}>{getRoleName(emp.roleId)}</TableCell>
                  <TableCell style={{ fontSize: '13px' }}>{getDeptName(emp.departmentId)}</TableCell>
                  <TableCell style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{getManagerName(emp.managerId)}</TableCell>
                  <TableCell>
                    <TableStatusBadge variant={emp.isActive ? 'active' : 'inactive'}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </TableStatusBadge>
                  </TableCell>
                  <TableActionCell>
                    <TableIconButton 
                      variant="edit" 
                      title="Edit Employee Account" 
                      onClick={() => handleOpenDialog(emp)}
                    />
                  </TableActionCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* ── Add/Edit Dialog (Multi-Step Form) ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        maxWidth="750px"
        title={editingEmp ? "Configure Employee Profile" : "Add New Employee"}
        footer={
          <>
            <button 
              className="btn-secondary"
              onClick={() => currentStep > 1 ? setCurrentStep(c => c - 1) : setIsDialogOpen(false)}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {currentStep > 1 ? <><ChevronLeft size={16} /> Back</> : "Cancel"}
            </button>
            <button 
              className="btn-primary"
              disabled={isPrimaryBtnDisabled}
              onClick={() => currentStep < 3 ? setCurrentStep(c => c + 1) : handleSave()}
              style={{
                background: isPrimaryBtnDisabled ? 'var(--color-text-muted)' : 'var(--color-accent)',
                opacity: isPrimaryBtnDisabled ? 0.6 : 1,
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: isPrimaryBtnDisabled ? 'not-allowed' : 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {currentStep < 3 ? <>Next Step <ChevronRight size={16} /></> : (editingEmp ? "Update Record" : "Finalize Profile")}
            </button>
          </>
        }
      >
        {renderStepIndicators()}

        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
          {currentStep === 1 && (
            <div className="anim" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>Personal Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Username <span className="input-requied">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    autoComplete="off"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="input-requied">*</span></label>
                  <input 
                    type="password" 
                    className="form-input" 
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingEmp ? "Leave blank to keep unchanged" : ""}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">First Name <span className="input-requied">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name <span className="input-requied">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="input-requied">*</span></label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile No. <span className="input-requied">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.mobile_no}
                    onChange={e => setFormData({ ...formData, mobile_no: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.date_of_birth}
                    onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-input" 
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select Gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer Not to Say">Prefer Not to Say</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Profile Image</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-input" 
                    style={{ paddingTop: '8px' }}
                    onChange={e => {
                      // Mock file handler
                      if (e.target.files && e.target.files[0]) {
                        setFormData({ ...formData, profile_image: e.target.files[0].name });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="anim" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>Organizational Assignment</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Employee Code <span className="input-requied">*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.employeeCode}
                    onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. 10107"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.company}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Unit <span className="input-requied">*</span></label>
                  <select 
                    className="form-input" 
                    value={formData.businessUnitId}
                    onChange={e => setFormData({ ...formData, businessUnitId: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select BU...</option>
                    {businessUnits?.map(bu => (
                      <option key={bu.id} value={bu.id}>{bu.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department <span className="input-requied">*</span></label>
                  <select 
                    className="form-input" 
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select Department...</option>
                    {departments?.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Location <span className="input-requied">*</span></label>
                  <select 
                    className="form-input" 
                    value={formData.locationId}
                    onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select Location...</option>
                    {locations?.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Job Role / Designation <span className="input-requied">*</span></label>
                  <select 
                    className="form-input" 
                    value={formData.roleId}
                    onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select Role...</option>
                    {jobRoles?.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.joiningDate}
                    onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="anim" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>Assign Reporting Manager</h3>
              <div className="form-group">
                <label className="form-label">Reporting Manager</label>
                <select 
                  className="form-input" 
                  value={formData.managerId}
                  onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">No Line Manager (Root Node)</option>
                  {employees?.filter(e => e.id !== editingEmp?.id).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} [{emp.employeeCode}]</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', color: 'var(--color-text-primary)' }}>Account Access Status</label>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Revoking active status will immediately suspend login capabilities.</span>
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
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default EmployeePage;
