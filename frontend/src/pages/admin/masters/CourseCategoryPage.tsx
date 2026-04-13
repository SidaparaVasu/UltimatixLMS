import React, { useState } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { useCourseCategories } from '@/queries/admin/useAdminMasters';
import { CourseCategory } from '@/api/admin-mock-api';
import { useAdminCRUD } from '@/hooks/admin/useAdminCRUD';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { GridSwitcher, ViewMode } from '@/components/admin/GridSwitcher';
import { GridTableCard } from '@/components/admin/GridTableCard';
import { AdminInput, AdminToggle, DialogFooterActions } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';

/* ── Form shape ──────────────────────────────────────────────── */
interface CategoryForm {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

/* ── Column definitions ──────────────────────────────────────── */
const buildColumns = (
  onEdit: (cat: CourseCategory) => void,
  onDelete: (cat: CourseCategory) => void,
): DataTableColumn<CourseCategory>[] => [
  { type: 'id',     key: 'code',        header: 'Code', width: '130px' },
  { type: 'text',   key: 'name',        header: 'Category Name', cellStyle: { fontWeight: 600, color: 'var(--color-text-primary)' } },
  { type: 'text',   key: 'description', header: 'Description' },
  { 
    type: 'custom', 
    header: 'Courses', 
    width: '100px',
    render: (cat) => <span className="font-bold">{cat.courseCount}</span> 
  },
  { type: 'status', key: 'isActive',    header: 'Status', width: '110px' },
  { type: 'actions', onEdit, onDelete },
];

const CourseCategoryPage: React.FC = () => {
  const { data: categories, isLoading, error } = useCourseCategories();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const crud = useAdminCRUD<CourseCategory, CategoryForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: (cat) => ({
      name: cat.name,
      code: cat.code,
      description: cat.description,
      isActive: cat.isActive,
    }),
  });

  const [searchTerm, setSearchTerm] = useState('');

  /* ── Filtering ── */
  const filteredData = categories?.filter((cat) => {
    const q = searchTerm.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) || 
      cat.code.toLowerCase().includes(q)
    );
  });

  const handleSave = () => {
    console.log(crud.editingItem ? "Update:" : "Create:", crud.formData);
    crud.closeDialog();
  };

  const isFormValid = !!(crud.formData.name.trim() && crud.formData.code.trim());

  return (
    <AdminMasterLayout
      title="Course Categories"
      description="Manage logical buckets for organizing your content library."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Courses' },
        { label: 'Categories' },
      ]}
      addLabel="New Category"
      onAdd={() => crud.openDialog()}
      searchPlaceholder="Search categories..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={filteredData?.length}
    >
      <GridSwitcher
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        gridContent={
          filteredData?.map((cat) => (
            <GridTableCard<CourseCategory>
              key={cat.id}
              row={cat}
              title={cat.name}
              subtitle={cat.code}
              description={cat.description}
              isActive={cat.isActive}
              metrics={[
                { label: 'Courses', value: cat.courseCount }
              ]}
              icon={LayoutGrid}
              onEdit={() => crud.openDialog(cat)}
              onDelete={() => console.log('Delete', cat.id)}
              onView={() => console.log('View', cat.id)}
            />
          ))
        }
        tableContent={
          <AdminDataTable<CourseCategory>
            rowKey="id"
            columns={buildColumns(crud.openDialog, (cat) => console.log('Delete', cat.id))}
            data={filteredData}
            isLoading={isLoading}
            error={error}
            emptyMessage="No categories found."
            skeletonRowCount={4}
          />
        }
      />

      {/* ── Add/Edit Dialog ── */}
      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? "Edit Category" : "Add Category"}
        description="Categories help structure your course library into logical topics."
        footer={
          <DialogFooterActions
            onCancel={crud.closeDialog}
            onSave={handleSave}
            isEditing={!!crud.editingItem}
            label="Category"
            isSaveDisabled={!isFormValid}
          />
        }
      >
        <div className="flex flex-col gap-4">
          <AdminInput
              label="Category Name"
              required
              value={crud.formData.name}
              onChange={(v) => crud.setField('name', v)}
              placeholder="e.g. Technical Skills"
            />
          <AdminInput
              label="Category Code"
              required
              value={crud.formData.code}
              onChange={(v) => crud.setField('code', v)}
              placeholder="e.g. CAT-TECH"
            />
          <AdminInput
            label="Description"
            value={crud.formData.description}
            onChange={(v) => crud.setField('description', v)}
            placeholder="Briefly describe what courses fall under this category..."
          />
          <AdminToggle
            label="Active Status"
            hint="Inactive categories will be hidden from the learner portal."
            checked={crud.formData.isActive}
            onChange={(v) => crud.setField('isActive', v)}
          />
        </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default CourseCategoryPage;
