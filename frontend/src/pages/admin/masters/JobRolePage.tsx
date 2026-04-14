import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ToggleLeft, ToggleRight } from "lucide-react";
import {
  useJobRoles,
  useSkills,
  useSkillLevels,
  useJobRoleSkills,
  ADMIN_QUERY_KEYS,
} from "@/queries/admin/useAdminMasters";
import { organizationApi, JobRole } from "@/api/organization-api";
import { useAdminCRUD } from "@/hooks/admin/useAdminCRUD";
import { AdminMasterLayout } from "@/components/admin/layout/AdminMasterLayout";
import {
  AdminDataTable,
  DataTableColumn,
} from "@/components/admin/layout/AdminDataTable";
import {
  AdminInput,
  DialogFooterActions,
} from "@/components/admin/form";
import { Dialog } from "@/components/ui/dialog";
import { CellScrollArea } from "@/components/ui/cell-scroll-area";
import { SkillTag } from "@/components/ui/skill-tag";
import {
  UnifiedSkillMappingModal,
  SkillMappingEntry,
} from "@/components/admin/UnifiedSkillMappingModal";

/* ── Form shape ──────────────────────────────────────────────── */
interface JobRoleForm {
  job_role_name: string;
  job_role_code: string;
  description: string;
}

const EMPTY_FORM: JobRoleForm = {
  job_role_name: "",
  job_role_code: "",
  description: "",
};

/* ── Column definitions ──────────────────────────────────────── */
const buildColumns = (
  onEdit: (role: JobRole) => void,
  onMap: (role: JobRole) => void,
  onToggleStatus: (role: JobRole) => void,
  allSkills: any[],
  roleSkills: any[],
): DataTableColumn<JobRole>[] => [
  { 
    type: "custom", 
    header: "Designation", 
    cellStyle: { fontWeight: 600, color: "var(--color-text-primary)" },
    render: (role) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '14px' }}>{role.job_role_name}</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{role.job_role_code}</span>
      </div>
    )
  },
  {
    type: "custom",
    header: "Required Skills",
    render: (role) => {
      // Note: Skill mapping currently uses mock data structure for IDs
      const mapped = roleSkills.filter((rs) => rs.jobRoleId === role.id);
      return (
        <CellScrollArea style={{ maxWidth: "500px" }}>
          {mapped.length === 0 ? (
            <span
              style={
                {
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                  italic: "true",
                } as any
              }
            >
              No skills mapped
            </span>
          ) : (
            mapped.map((m) => {
              const s = allSkills.find((sk) => sk.id === m.skillId);
              return s ? <SkillTag key={m.id} name={s.name || s.skill_name} /> : null;
            })
          )}
        </CellScrollArea>
      );
    },
  },
  { type: "status", key: "is_active", header: "Status", width: "110px" },
  { type: "actions", onEdit, onMap, onToggle: onToggleStatus },
];

const JobRolePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: response, isLoading, error } = useJobRoles({ page, page_size: pageSize });
  const { data: allSkills = [] } = useSkills();
  const { data: allLevels = [] } = useSkillLevels();
  const { data: roleSkills = [] } = useJobRoleSkills();

  const [mappingRole, setMappingRole] = useState<JobRole | null>(null);
  const [isMappingOpen, setIsMappingOpen] = useState(false);

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (data: Partial<JobRole>) => 
      data.id 
        ? organizationApi.updateJobRole(data.id, data) 
        : organizationApi.createJobRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.jobRoles });
      crud.closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      organizationApi.updateJobRole(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.jobRoles });
    },
  });

  const crud = useAdminCRUD<JobRole, JobRoleForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: (role) => ({
      job_role_name: role.job_role_name,
      job_role_code: role.job_role_code,
      description: role.description || "",
    }),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ── Filtering (Frontend-side on current page) ── */
  const filteredData = response?.results?.filter((role) => {
    const matchesSearch = (role.job_role_name + role.job_role_code)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active") === role.is_active;
    return matchesSearch && matchesStatus;
  });

  /* ── Handlers ── */
  const handleSave = () => {
    saveMutation.mutate({
      ...crud.formData,
      id: crud.editingItem?.id,
    });
  };

  const handleToggleStatus = (role: JobRole) => {
    toggleMutation.mutate({ id: role.id, is_active: !role.is_active });
  };

  const isFormValid = !!(
    crud.formData.job_role_name.trim() && crud.formData.job_role_code.trim()
  );

  /* ── Mapping logic ── */
  const handleOpenMapping = (role: JobRole) => {
    setMappingRole(role);
    setIsMappingOpen(true);
  };

  const currentMappings: SkillMappingEntry[] = roleSkills
    .filter((rs) => rs.jobRoleId === mappingRole?.id)
    .map((rs) => ({ skillId: rs.skillId, levelId: rs.requiredLevelId }));

  const handleSaveMapping = (mappings: SkillMappingEntry[]) => {
    console.log("Saving Job Role Skills for", mappingRole?.job_role_name, mappings);
    // Logic to update backend would go here
  };

  return (
    <AdminMasterLayout
      title="Job Roles"
      description="Define and manage company designations and job titles."
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Organization" },
        { label: "Job Roles" },
      ]}
      addLabel="Add Job Role"
      onAdd={() => crud.openDialog()}
      searchPlaceholder="Search by Role Name or Code..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={response?.count}
      filterSlot={
        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "140px", cursor: "pointer", flexShrink: 0 }}
        >
          <option value="all">Status: All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      }
    >
      <AdminDataTable<JobRole>
        rowKey="id"
        columns={buildColumns(
          crud.openDialog,
          handleOpenMapping,
          handleToggleStatus,
          allSkills,
          roleSkills,
        )}
        data={filteredData}
        isLoading={isLoading || toggleMutation.isPending}
        error={error}
        emptyMessage="No job roles found on this page."
        skeletonRowCount={4}
        pagination={{
            page,
            pageSize,
            total: response?.count ?? 0,
            onPageChange: setPage,
        }}
      />

      {/* ── Mapping Modal ── */}
      <UnifiedSkillMappingModal
        open={isMappingOpen}
        onClose={() => setIsMappingOpen(false)}
        title={`Map Required Skills: ${mappingRole?.job_role_name}`}
        description="Specify proficiency requirements for this designation."
        type="ROLE"
        allSkills={allSkills}
        allLevels={allLevels}
        initialMappings={currentMappings}
        onSave={handleSaveMapping}
      />

      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? "Edit Job Role" : "Add Job Role"}
        description="Configure titles and designations available in the organization."
        footer={
          <DialogFooterActions
            onCancel={crud.closeDialog}
            onSave={handleSave}
            isEditing={!!crud.editingItem}
            label="Job Role"
            isSaveDisabled={!isFormValid}
            isLoading={saveMutation.isPending}
          />
        }
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <AdminInput
            label="Role Code"
            required
            value={crud.formData.job_role_code}
            onChange={(v) => crud.setField("job_role_code", v)}
            placeholder="e.g. ROLE-SE"
          />
          <AdminInput
            label="Job Title"
            required
            value={crud.formData.job_role_name}
            onChange={(v) => crud.setField("job_role_name", v)}
            placeholder="e.g. Software Engineer"
          />
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              style={{ height: '80px', paddingTop: '8px', resize: 'none' }}
              placeholder="Brief description of responsibilities..."
              value={crud.formData.description}
              onChange={e => crud.setField('description', e.target.value)}
            />
          </div>
          </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default JobRolePage;
