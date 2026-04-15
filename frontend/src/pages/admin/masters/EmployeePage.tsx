import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "@/stores/notificationStore";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Building2,
  Network,
  Check,
} from "lucide-react";
import {
  useEmployees,
  useSkills,
  useSkillLevels,
  useEmployeeSkills,
  useEmployeeManagerOptions,
  useBusinessUnitOptions,
  useDepartmentOptions,
  useLocationOptions,
  useJobRoleOptions,
  ADMIN_QUERY_KEYS,
} from "@/queries/admin/useAdminMasters";
import { organizationApi } from "@/api/organization-api";
import { skillApi } from "@/api/skill-api";
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeDirectoryRow,
  EmployeeUpdatePayload,
  DropdownOption,
} from "@/types/org.types";
import { AdminMasterLayout } from "@/components/admin/layout/AdminMasterLayout";
import {
  AdminDataTable,
  DataTableColumn,
} from "@/components/admin/layout/AdminDataTable";
import { AdminInput, AdminSelect, AdminToggle } from "@/components/admin/form";
import { Dialog } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { ProficiencyBadge } from "@/components/ui/proficiency-badge";
import {
  UnifiedSkillMappingModal,
  SkillMappingEntry,
} from "@/components/admin/UnifiedSkillMappingModal";

/* ─────────────────────────────────────────────────────────────
   FORM SHAPE
───────────────────────────────────────────────────────────── */
interface EmpForm {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile_no: string;
  profile_image: string;
  date_of_birth: string;
  gender: string;
  employeeCode: string;
  company: string;
  businessUnitId: string;
  departmentId: string;
  roleId: string;
  locationId: string;
  managerId: string;
  joiningDate: string;
  isActive: boolean;
}

const EMPTY_FORM: EmpForm = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  mobile_no: "",
  profile_image: "",
  date_of_birth: "",
  gender: "",
  employeeCode: "",
  company: "Ultimatix Global",
  businessUnitId: "",
  departmentId: "",
  roleId: "",
  locationId: "",
  managerId: "",
  joiningDate: "",
  isActive: true,
};

/* ─────────────────────────────────────────────────────────────
   DRAWER — read-only detail field pair
───────────────────────────────────────────────────────────── */
const DetailField: React.FC<{
  label: string;
  value: string;
  capitalize?: boolean;
}> = ({ label, value, capitalize }) => (
  <div>
    <div
      style={{
        fontSize: "12px",
        color: "var(--color-text-muted)",
        marginBottom: "4px",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: "14px",
        fontWeight: 500,
        textTransform: capitalize ? "capitalize" : undefined,
      }}
    >
      {value || "-"}
    </div>
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h4
    style={{
      fontSize: "12px",
      textTransform: "uppercase",
      color: "var(--color-text-muted)",
      fontWeight: 700,
      letterSpacing: "0.05em",
      marginBottom: "var(--space-3)",
    }}
  >
    {title}
  </h4>
);

const TwoColGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-4)",
    }}
  >
    {children}
  </div>
);

const normalizeEmployeeRow = (row: EmployeeDirectoryRow): Employee => ({
  id: row.id,
  user: row.user,
  username: row.username,
  email: row.email,
  firstName: row.first_name || "",
  lastName: row.last_name || "",
  fullName:
    row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
  mobile_no: row.phone_number || "",
  profile_image: row.profile_image_url || "",
  date_of_birth: row.date_of_birth || "",
  gender: row.gender || "",
  employeeCode: row.employee_code,
  company: row.company_name || "Ultimatix Global",
  companyName: row.company_name || "Ultimatix Global",
  businessUnitId: row.business_unit != null ? String(row.business_unit) : "",
  businessUnitName: row.business_unit_name || "",
  departmentId: row.department != null ? String(row.department) : "",
  departmentName: row.department_name || "",
  roleId: row.job_role != null ? String(row.job_role) : "",
  jobRoleName: row.job_role_name || "",
  locationId: row.location != null ? String(row.location) : "",
  locationName: row.location_name || "",
  managerId: row.manager != null ? String(row.manager) : "",
  managerName: row.manager_name || "",
  joiningDate: row.joining_date || "",
  isActive: row.is_active,
  employmentStatus: row.employment_status || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toOptions = (items?: DropdownOption[]) =>
  (items ?? []).map((item) => ({ label: item.name, value: String(item.id) }));

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
const EmployeePage: React.FC = () => {
  /* ── Mapping state ── */
  const [mappingEmp, setMappingEmp] = useState<Employee | null>(null);
  const [isMappingOpen, setIsMappingOpen] = useState(false);

  /* ── Local state (can't use useAdminCRUD — multi-step needs currentStep) ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    businessUnit: "all",
    department: "all",
    location: "all",
    role: "all",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmpForm>({ ...EMPTY_FORM });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const {
    data: employeesRes,
    isLoading,
    error,
  } = useEmployees({ page, page_size: pageSize });
  const { data: businessUnitOptions } = useBusinessUnitOptions();
  const { data: departmentOptions } = useDepartmentOptions(
    formData.businessUnitId
      ? { businessUnitId: Number(formData.businessUnitId) }
      : undefined,
  );
  const { data: locationOptions } = useLocationOptions();
  const { data: jobRoleOptions } = useJobRoleOptions();
  const { data: skillsRes } = useSkills();
  const { data: levelsRes } = useSkillLevels();
  const { data: empSkillsRes } = useEmployeeSkills({ page_size: 1000 });
  const { data: managerOptions = [] } = useEmployeeManagerOptions(
    editingEmp ? { excludeEmployeeId: editingEmp.id } : undefined,
  );

  const employees = (employeesRes?.results ?? []).map(normalizeEmployeeRow);
  const allSkills = skillsRes?.results ?? [];
  const allLevels = levelsRes?.results ?? [];
  const skills = allSkills;
  const levels = allLevels;

  const businessUnitSelectOptions = toOptions(businessUnitOptions);
  const departmentSelectOptions = toOptions(departmentOptions);
  const locationSelectOptions = toOptions(locationOptions);
  const jobRoleSelectOptions = toOptions(jobRoleOptions);
  const managerSelectOptions = managerOptions.map((opt) => ({
    label: opt.full_name,
    value: String(opt.id),
  }));

  /* ── Helpers ── */
  const setField = <K extends keyof EmpForm>(k: K, v: EmpForm[K]) =>
    setFormData((prev) => ({ ...prev, [k]: v }));

  const parseId = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const buildEmployeePayload = (
    includePassword: boolean,
  ): EmployeeCreatePayload => {
    const payload: EmployeeCreatePayload = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone_number: formData.mobile_no.trim() || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      gender: formData.gender || undefined,
      employee_code: formData.employeeCode.trim(),
      business_unit: parseId(formData.businessUnitId),
      department: parseId(formData.departmentId),
      job_role: parseId(formData.roleId),
      location: parseId(formData.locationId),
      manager: formData.managerId
        ? (parseId(formData.managerId) ?? null)
        : null,
      joining_date: formData.joiningDate || undefined,
      is_active: formData.isActive,
    };

    if (includePassword && formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    return payload;
  };

  const buildCreatePayload = (): EmployeeCreatePayload =>
    buildEmployeePayload(true);

  const buildUpdatePayload = (): EmployeeUpdatePayload => {
    const payload = buildEmployeePayload(false);
    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }
    return payload;
  };

  const getManagerLabel = (managerName: string, email: string) =>
    managerName ? `${managerName} ${email ? `(${email})` : ""}`.trim() : "-";

  /* ── Validation ── */
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

  const createMutation = useMutation({
    mutationFn: (payload: EmployeeCreatePayload) =>
      organizationApi.createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.employees });
      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.employeeManagerOptions,
      });
      closeDialog();
    },
    onError: (error: any) => {
      const managerError = error.response?.data?.errors?.manager?.[0];
      if (managerError) {
        showNotification(managerError, "error");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: EmployeeUpdatePayload;
    }) => organizationApi.updateEmployee(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.employees });
      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.employeeManagerOptions,
      });
      closeDialog();
    },
    onError: (error: any) => {
      const managerError = error.response?.data?.errors?.manager?.[0];
      if (managerError) {
        showNotification(managerError, "error");
      }
    },
  });

  const showNotification = useNotificationStore(
    (state) => state.showNotification,
  );

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      organizationApi.updateEmployee(id, { is_active: isActive }, false),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.employees });
      const message = variables.isActive
        ? "Employee profile activated successfully."
        : "Employee profile deactivated successfully.";
      showNotification(message, "success");
    },
  });

  /* ── Dialog open/close ── */
  const openDialog = (emp?: Employee) => {
    setCurrentStep(1);
    if (emp) {
      setEditingEmp(emp);
      setFormData({
        username: emp.username || "",
        password: "",
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        mobile_no: emp.mobile_no || "",
        profile_image: emp.profile_image || "",
        date_of_birth: emp.date_of_birth || "",
        gender: emp.gender || "",
        employeeCode: emp.employeeCode,
        company: emp.companyName || "Ultimatix Global",
        businessUnitId: emp.businessUnitId || "",
        departmentId: emp.departmentId,
        roleId: emp.roleId,
        locationId: emp.locationId || "",
        joiningDate: (emp as any).joiningDate || "",
        managerId: emp.managerId || "",
        isActive: emp.isActive,
      });
    } else {
      setEditingEmp(null);
      setFormData({ ...EMPTY_FORM });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setEditingEmp(null);
      setFormData({ ...EMPTY_FORM });
      setCurrentStep(1);
    }, 200);
  };

  const handleSave = () => {
    if (editingEmp) {
      updateMutation.mutate({
        id: editingEmp.id,
        payload: buildUpdatePayload(),
      });
    } else {
      createMutation.mutate(buildCreatePayload());
    }
  };

  const handleToggleEmployeeStatus = (emp: Employee) => {
    toggleActiveMutation.mutate({ id: emp.id, isActive: !emp.isActive });
  };

  /* ── Mapping logic ── */
  const handleOpenMapping = (emp: Employee) => {
    setMappingEmp(emp);
    setIsMappingOpen(true);
  };

  const syncEmployeeSkillsMutation = useMutation({
    mutationFn: (mappings: SkillMappingEntry[]) => {
      if (!mappingEmp) return Promise.reject("No employee selected");
      return skillApi.bulkSyncEmployeeSkills({
        employee_id: mappingEmp.id,
        skills: mappings.map((m) => ({
          skill_id: Number(m.skillId),
          level_id: Number(m.levelId),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.employeeSkills,
      });
      showNotification("Employee skills updated successfully", "success");
      setIsMappingOpen(false);
    },
    onError: () => {
      showNotification("Failed to update employee skills", "error");
    },
  });

  const currentMappings: SkillMappingEntry[] = useMemo(() => {
    if (!mappingEmp || !empSkillsRes?.results) return [];
    return empSkillsRes.results
      .filter((es: any) => es.employee === mappingEmp.id)
      .map((es: any) => ({
        skillId: String(es.skill),
        levelId: String(es.current_level),
        status: es.status,
      }));
  }, [mappingEmp, empSkillsRes]);

  const handleSaveMapping = (mappings: SkillMappingEntry[]) => {
    syncEmployeeSkillsMutation.mutate(mappings);
  };

  /* ── Filtering ── */
  const filteredData = employees?.filter((emp) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q);
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active") === emp.isActive;
    const matchesBU =
      filters.businessUnit === "all" ||
      emp.businessUnitId === filters.businessUnit;
    const matchesDept =
      filters.department === "all" || emp.departmentId === filters.department;
    const matchesLoc =
      filters.location === "all" || emp.locationId === filters.location;
    const matchesRole = filters.role === "all" || emp.roleId === filters.role;
    return (
      matchesSearch &&
      matchesStatus &&
      matchesBU &&
      matchesDept &&
      matchesLoc &&
      matchesRole
    );
  });

  const activeFilters = Object.entries(filters).filter(([, v]) => v !== "all");
  const lookupLabel = (
    options: { label: string; value: string }[],
    value: string,
  ) => options.find((option) => option.value === value)?.label || "-";

  const getFilterLabel = (key: string, val: string) => {
    const map: Record<string, (v: string) => string> = {
      status: (v) => (v === "active" ? "Active" : "Inactive"),
      department: (v) => lookupLabel(departmentSelectOptions, v),
      role: (v) => lookupLabel(jobRoleSelectOptions, v),
      businessUnit: (v) => lookupLabel(businessUnitSelectOptions, v),
      location: (v) => lookupLabel(locationSelectOptions, v),
    };
    return map[key]?.(val) ?? val;
  };

  /* ── Column definitions ── */
  const columns: DataTableColumn<Employee>[] = [
    { type: "id", key: "employeeCode", header: "Emp Code", width: "120px" },
    {
      type: "profile",
      key: "fullName",
      header: "Employee",
      subKey: "email",
      cellStyle: { fontWeight: 600, color: "var(--color-text-primary)" },
    },
    {
      type: "custom",
      header: "Designation",
      render: (emp) => (
        <span style={{ fontSize: "13px" }}>{emp.jobRoleName || "-"}</span>
      ),
    },
    {
      type: "custom",
      header: "Department",
      render: (emp) => (
        <span style={{ fontSize: "13px" }}>{emp.departmentName || "-"}</span>
      ),
    },
    {
      type: "custom",
      header: "Manager",
      render: (emp) => (
        <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
          {emp.managerName || "-"}
        </span>
      ),
    },
    { type: "status", key: "isActive", header: "Status", width: "100px" },
    {
      type: "actions",
      onView: (emp) => {
        setViewingEmp(emp);
        setIsViewDrawerOpen(true);
      },
      onEdit: openDialog,
      onMap: handleOpenMapping,
      onToggle: handleToggleEmployeeStatus,
      getIsActive: (emp) => emp.isActive,
    },
  ];

  /* ── Step indicator ── */
  const STEPS = [
    {
      step: 1,
      label: "Basic Information",
      icon: <User size={16} />,
      valid: isStep1Valid,
    },
    {
      step: 2,
      label: "Company Information",
      icon: <Building2 size={16} />,
      valid: isStep2Valid,
    },
    { step: 3, label: "Reporting", icon: <Network size={16} />, valid: true },
  ];

  const renderStepIndicators = () => (
    <div
      style={{
        display: "flex",
        width: "calc(100% + var(--space-6) * 2)",
        margin:
          "calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) var(--space-6) calc(-1 * var(--space-6))",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        position: "sticky",
        top: "calc(-1 * var(--space-6))",
        zIndex: 10,
      }}
    >
      {STEPS.map((s) => {
        const isActive = currentStep === s.step;
        const isCompleted = s.valid;
        const color = isCompleted
          ? {
              main: "var(--success)",
              bg: "transparent",
              circleBg: "var(--success)",
              circleText: "#fff",
              border: "var(--success)",
            }
          : isActive
            ? {
                main: "#3b82f6",
                bg: "#eff6ff",
                circleBg: "#3b82f6",
                circleText: "#fff",
                border: "#3b82f6",
              }
            : {
                main: "var(--color-text-muted)",
                bg: "transparent",
                circleBg: "#f1f5f9",
                circleText: "#94a3b8",
                border: "transparent",
              };

        return (
          <div
            key={s.step}
            onClick={() => setCurrentStep(s.step)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "16px 8px",
              cursor: "pointer",
              background: color.bg,
              borderBottom: `2px solid ${color.border}`,
              transition: "all 0.2s",
              color: color.main,
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: color.circleBg,
                color: color.circleText,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {isCompleted ? <Check size={14} strokeWidth={3} /> : s.step}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {s.icon}
              <span
                style={{ fontSize: "13px", fontWeight: isActive ? 600 : 500 }}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const GENDER_OPTIONS = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <AdminMasterLayout
      title="Employee Directory"
      description="A unified manifest of all personnel and their corporate reporting lines."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Workforce" },
        { label: "Employees" },
      ]}
      addLabel="Add Employee"
      onAdd={() => openDialog()}
      searchPlaceholder="Search by Name, Code, or Email..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={filteredData?.length}
      filterSlot={
        <>
          <select
            className="form-input"
            value={filters.status}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value }))
            }
            style={{ width: "120px", cursor: "pointer", flexShrink: 0 }}
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="form-input"
            value={filters.businessUnit}
            onChange={(e) =>
              setFilters((p) => ({ ...p, businessUnit: e.target.value }))
            }
            style={{ width: "120px", cursor: "pointer", flexShrink: 0 }}
          >
            <option value="all">BU: All</option>
            {businessUnitSelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={filters.location}
            onChange={(e) =>
              setFilters((p) => ({ ...p, location: e.target.value }))
            }
            style={{ width: "120px", cursor: "pointer", flexShrink: 0 }}
          >
            <option value="all">Loc: All</option>
            {locationSelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={filters.department}
            onChange={(e) =>
              setFilters((p) => ({ ...p, department: e.target.value }))
            }
            style={{ width: "120px", cursor: "pointer", flexShrink: 0 }}
          >
            <option value="all">Dept: All</option>
            {departmentSelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={filters.role}
            onChange={(e) =>
              setFilters((p) => ({ ...p, role: e.target.value }))
            }
            style={{ width: "120px", cursor: "pointer", flexShrink: 0 }}
          >
            <option value="all">Role: All</option>
            {jobRoleSelectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      }
      chips={{
        activeFilters,
        onRemove: (key) => setFilters((p) => ({ ...p, [key]: "all" })),
        onClearAll: () =>
          setFilters({
            status: "all",
            businessUnit: "all",
            department: "all",
            location: "all",
            role: "all",
          }),
        getLabel: getFilterLabel,
        getKeyLabel: (key) => (key === "businessUnit" ? "BU" : key),
      }}
    >
      {/* ── Data Table ── */}
      <AdminDataTable<Employee>
        rowKey="id"
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        error={error}
        emptyMessage="No employees found."
        skeletonRowCount={5}
      />

      {/* ── Add / Edit Dialog (Multi-Step) ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        maxWidth="750px"
        title={editingEmp ? "Configure Employee Profile" : "Add New Employee"}
        footer={
          <>
            <button
              onClick={() =>
                currentStep > 1 ? setCurrentStep((c) => c - 1) : closeDialog()
              }
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                color: "var(--color-text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {currentStep > 1 ? (
                <>
                  <ChevronLeft size={16} /> Back
                </>
              ) : (
                "Cancel"
              )}
            </button>
            <button
              disabled={currentStep === 3 && !isAllValid}
              onClick={() =>
                currentStep < 3 ? setCurrentStep((c) => c + 1) : handleSave()
              }
              style={{
                background:
                  currentStep === 3 && !isAllValid
                    ? "var(--color-text-muted)"
                    : "var(--color-accent)",
                opacity: currentStep === 3 && !isAllValid ? 0.6 : 1,
                border: "none",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor:
                  currentStep === 3 && !isAllValid ? "not-allowed" : "pointer",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {currentStep < 3 ? (
                <>
                  Next Step <ChevronRight size={16} />
                </>
              ) : editingEmp ? (
                "Update Record"
              ) : (
                "Finalize Profile"
              )}
            </button>
          </>
        }
      >
        {renderStepIndicators()}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            paddingBottom: "80px",
          }}
        >
          {/* ── Step 1: Personal ── */}
          {currentStep === 1 && (
            <div
              className="anim"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "var(--space-4)",
                  color: "var(--color-text-primary)",
                }}
              >
                Personal Information
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0 var(--space-4)",
                }}
              >
                <AdminInput
                  label="Username"
                  required
                  value={formData.username}
                  onChange={(v) => setField("username", v)}
                  autoComplete="off"
                />
                <AdminInput
                  label="Password"
                  required={!editingEmp}
                  type="password"
                  value={formData.password}
                  onChange={(v) => setField("password", v)}
                  placeholder={
                    editingEmp ? "Leave blank to keep unchanged" : ""
                  }
                  autoComplete="new-password"
                />
                <AdminInput
                  label="First Name"
                  required
                  value={formData.firstName}
                  onChange={(v) => setField("firstName", v)}
                />
                <AdminInput
                  label="Last Name"
                  required
                  value={formData.lastName}
                  onChange={(v) => setField("lastName", v)}
                />
                <AdminInput
                  label="Email"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(v) => setField("email", v)}
                />
                <AdminInput
                  label="Mobile No."
                  required
                  type="tel"
                  value={formData.mobile_no}
                  onChange={(v) => setField("mobile_no", v)}
                />
                <AdminInput
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(v) => setField("date_of_birth", v)}
                />
                <AdminSelect
                  label="Gender"
                  value={formData.gender}
                  onChange={(v) => setField("gender", v)}
                  options={GENDER_OPTIONS}
                />
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-input"
                    style={{ padding: "6px" }}
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        setField("profile_image", e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Org ── */}
          {currentStep === 2 && (
            <div
              className="anim"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "var(--space-4)",
                  color: "var(--color-text-primary)",
                }}
              >
                Organizational Assignment
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0 var(--space-4)",
                }}
              >
                <AdminInput
                  label="Employee Code"
                  required
                  value={formData.employeeCode}
                  onChange={(v) => setField("employeeCode", v)}
                  placeholder="e.g. 10107"
                />
                <AdminInput
                  label="Company"
                  value={formData.company}
                  onChange={() => {}}
                  disabled
                />
                <AdminSelect
                  label="Business Unit"
                  required
                  value={formData.businessUnitId}
                  onChange={(v) => {
                    setField("businessUnitId", v);
                    setField("departmentId", "");
                  }}
                  options={businessUnitSelectOptions}
                />
                <AdminSelect
                  label="Department"
                  required
                  value={formData.departmentId}
                  onChange={(v) => setField("departmentId", v)}
                  options={departmentSelectOptions}
                />
                <AdminSelect
                  label="Unit Location"
                  required
                  value={formData.locationId}
                  onChange={(v) => setField("locationId", v)}
                  options={locationSelectOptions}
                />
                <AdminSelect
                  label="Job Role / Designation"
                  required
                  value={formData.roleId}
                  onChange={(v) => setField("roleId", v)}
                  options={jobRoleSelectOptions}
                />
                <AdminInput
                  label="Joining Date"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(v) => setField("joiningDate", v)}
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Reporting ── */}
          {currentStep === 3 && (
            <div
              className="anim"
              style={{ display: "flex", flexDirection: "column" }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "var(--space-4)",
                  color: "var(--color-text-primary)",
                }}
              >
                Assign Reporting Manager
              </h3>
              <AdminSelect
                label="Reporting Manager"
                value={formData.managerId}
                onChange={(v) => setField("managerId", v)}
                placeholder="No Line Manager (Root Node)"
                options={managerSelectOptions}
              />
              <AdminToggle
                label="Account Access Status"
                hint="Revoking active status will immediately suspend login capabilities."
                checked={formData.isActive}
                onChange={(v) => setField("isActive", v)}
              />
            </div>
          )}
        </div>
      </Dialog>

      {/* ── View Employee Drawer ── */}
      <Drawer
        open={isViewDrawerOpen}
        onOpenChange={(op) => {
          setIsViewDrawerOpen(op);
          if (!op) setTimeout(() => setViewingEmp(null), 300);
        }}
        title="Employee Details"
        position="right"
        size="500px"
      >
        {viewingEmp && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
            }}
          >
            {/* Profile header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                paddingBottom: "var(--space-4)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "var(--color-surface-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                }}
              >
                {viewingEmp.firstName?.[0] || "?"}
                {viewingEmp.lastName?.[0] || ""}
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                  }}
                >
                  {viewingEmp.firstName} {viewingEmp.lastName}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: viewingEmp.isActive ? "#dcfce7" : "#f1f5f9",
                      color: viewingEmp.isActive ? "#166534" : "#64748b",
                    }}
                  >
                    {viewingEmp.isActive ? "Active" : "Inactive"}
                  </span>
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "14px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {viewingEmp.email}
                </p>
              </div>
            </div>

            {/* Details sections */}
            <div style={{ display: "grid", gap: "var(--space-5)" }}>
              <div>
                <SectionHeader title="Personal Details" />
                <TwoColGrid>
                  <DetailField label="Username" value={viewingEmp.username} />
                  <DetailField label="Mobile No" value={viewingEmp.mobile_no} />
                  <DetailField
                    label="Date of Birth"
                    value={viewingEmp.date_of_birth}
                  />
                  <DetailField
                    label="Gender"
                    value={viewingEmp.gender}
                    capitalize
                  />
                </TwoColGrid>
              </div>

              <div>
                <SectionHeader title="Organizational Info" />
                <TwoColGrid>
                  <DetailField
                    label="Emp Code"
                    value={viewingEmp.employeeCode}
                  />
                  <DetailField
                    label="Company"
                    value={viewingEmp.companyName || "Ultimatix Global"}
                  />
                  <DetailField
                    label="Business Unit"
                    value={viewingEmp.businessUnitName}
                  />
                  <DetailField
                    label="Location"
                    value={viewingEmp.locationName}
                  />
                  <DetailField
                    label="Department"
                    value={viewingEmp.departmentName}
                  />
                  <DetailField
                    label="Designation"
                    value={viewingEmp.jobRoleName}
                  />
                  <DetailField
                    label="Joining Date"
                    value={viewingEmp.joiningDate}
                  />
                </TwoColGrid>
              </div>

              <div>
                <SectionHeader title="Reporting Hierarchy" />
                <TwoColGrid>
                  <DetailField
                    label="Reporting Manager"
                    value={viewingEmp.managerName || "-"}
                  />
                </TwoColGrid>
              </div>

              <div>
                <SectionHeader title="Competency Profile" />
                {!empSkillsRes?.results?.filter(
                  (es) => es.employee === viewingEmp.id && es.is_active,
                ).length ? (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    No skill assessments recorded.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}
                  >
                    {empSkillsRes.results
                      .filter((es) => es.employee === viewingEmp.id && es.is_active)
                      .map((es) => {
                        const skill = allSkills.find((s) => s.id === es.skill);
                        const level = allLevels.find(
                          (l) => l.id === es.current_level,
                        );
                        if (!skill) return null;
                        return (
                          <div
                            key={es.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "var(--space-2) var(--space-3)",
                              background: "var(--color-canvas)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: 500 }}>{skill.skill_name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", }}>
                              <span style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", }}>
                                {(es as any).status === "VERIFIED" ? "✓ Verified" : "Pending"}
                              </span>
                              <ProficiencyBadge
                                level={level?.level_name || "Not Rated"}
                                rank={level?.level_rank || 0}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Skill Mapping Modal ── */}
      <UnifiedSkillMappingModal
        open={isMappingOpen}
        onClose={() => setIsMappingOpen(false)}
        title={`Assess Skills: ${mappingEmp?.firstName} ${mappingEmp?.lastName}`}
        description="Record verified or self-assessed proficiency levels."
        type="EMPLOYEE"
        allSkills={allSkills}
        allLevels={allLevels}
        initialMappings={currentMappings}
        onSave={handleSaveMapping}
      />
    </AdminMasterLayout>
  );
};

export default EmployeePage;
