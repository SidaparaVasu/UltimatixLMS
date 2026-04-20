import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Bolt, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCourses, useCourseCategories, ADMIN_QUERY_KEYS } from '@/queries/admin/useAdminMasters';
import { courseApi } from '@/api/course-api';
import { CourseMaster } from '@/types/courses.types';
import { useAdminCRUD } from '@/hooks/admin/useAdminCRUD';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { GridSwitcher, ViewMode } from '@/components/admin/GridSwitcher';
import { GridTableCard } from '@/components/admin/GridTableCard';
import { AdminInput, AdminSelect, AdminToggle, DialogFooterActions } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';

interface CourseForm {
  course_title: string;
  course_code: string;
  category: string;
  description: string;
  difficulty_level: CourseMaster['difficulty_level'] | string;
  estimated_duration_hours: string;
  is_active: boolean;
}

const EMPTY_FORM: CourseForm = {
  course_title: '',
  course_code: '',
  category: '',
  description: '',
  difficulty_level: 'BEGINNER',
  estimated_duration_hours: '0',
  is_active: true,
};

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'DOCTOR', label: 'Doctor' },
];

const CourseMasterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { data: response, isLoading, error } = useCourses({ page, page_size: pageSize });
  const courses = response?.results || [];

  const { data: categoriesRes } = useCourseCategories({ page_size: 100 });
  const categories = categoriesRes?.results || [];
  const categoryOptions = categories.map(cat => ({ value: String(cat.id), label: cat.category_name }));

  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (data: Partial<CourseMaster>) => 
      data.id 
        ? courseApi.updateCourse(data.id, data) 
        : courseApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.courses });
      crud.closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => courseApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.courses });
    },
  });

  const crud = useAdminCRUD<CourseMaster, CourseForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: (course) => ({
      course_title: course.course_title,
      course_code: course.course_code,
      category: String(course.category),
      description: course.description || '',
      difficulty_level: course.difficulty_level,
      estimated_duration_hours: String(course.estimated_duration_hours),
      is_active: course.is_active,
    }),
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = courses?.filter((course) => {
    const q = searchTerm.toLowerCase();
    return (
      course.course_title.toLowerCase().includes(q) || 
      course.course_code.toLowerCase().includes(q)
    );
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...crud.formData,
      category: Number(crud.formData.category),
      estimated_duration_hours: Number(crud.formData.estimated_duration_hours),
      difficulty_level: crud.formData.difficulty_level as CourseMaster['difficulty_level'],
      id: crud.editingItem?.id,
    });
  };

  const isFormValid = !!(
    crud.formData.course_title?.trim() && 
    crud.formData.course_code?.trim() && 
    crud.formData.category?.trim()
  );

  const buildColumns = (): DataTableColumn<CourseMaster>[] => [
    { type: 'id', key: 'course_code', header: 'Course Code', width: '130px' },
    { type: 'text', key: 'course_title', header: 'Title', cellStyle: { fontWeight: 600, color: 'var(--color-text-primary)' } },
    { type: 'text', key: 'difficulty_level', header: 'Difficulty' },
    { type: 'custom', header: 'Category', render: (c) => <span>{categories.find(cat => cat.id === c.category)?.category_name || '-'}</span> },
    { type: 'status', key: 'is_active', header: 'Status', width: '110px' },
    { 
      type: 'actions', 
      onEdit: crud.openDialog, 
      onDelete: (c) => deleteMutation.mutate(c.id),
      onView: (c) => navigate(`/admin/courses/builder/${c.id}`)
    },
  ];

  return (
    <AdminMasterLayout
      title="Course Master Hub"
      description="Manage course metadata and launch the Course Builder Studio."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Courses' },
        { label: 'Master Hub' },
      ]}
      addLabel="New Course"
      onAdd={() => crud.openDialog()}
      searchPlaceholder="Search courses..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      resultCount={filteredData?.length}
    >
      <GridSwitcher
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        gridContent={
          filteredData?.map((course) => (
            <GridTableCard<CourseMaster>
              key={course.id}
              row={course}
              title={course.course_title}
              subtitle={course.course_code}
              description={course.description}
              isActive={course.is_active}
              metrics={[
                { label: 'Hours', value: course.estimated_duration_hours },
                { label: 'Level', value: course.difficulty_level || 'N/A' },
              ]}
              icon={BookOpen}
              onEdit={() => crud.openDialog(course)}
              onDelete={() => deleteMutation.mutate(course.id)}
              onView={() => navigate(`/admin/courses/builder/${course.id}`)}
              viewLabel="Build Course"
              viewIcon={<Bolt size={14} />}
            />
          ))
        }
        tableContent={
          <AdminDataTable<CourseMaster>
            rowKey="id"
            columns={buildColumns()}
            data={filteredData}
            isLoading={isLoading}
            error={error}
            emptyMessage="No courses found."
            skeletonRowCount={4}
          />
        }
      />

      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? "Edit Course Metadata" : "Create New Course"}
        description="Define the core properties before building the content."
        footer={
          <DialogFooterActions
            onCancel={crud.closeDialog}
            onSave={handleSave}
            isEditing={!!crud.editingItem}
            label="Course"
            isSaveDisabled={!isFormValid}
          />
        }
      >
        <div className="flex flex-col">
          <AdminInput
            label="Course Title"
            required
            value={crud.formData.course_title}
            onChange={(v) => crud.setField('course_title', v)}
            placeholder="e.g. Advanced TypeScript"
          />
          <div className="flex gap-2 align-center">
            <AdminInput
              label="Course Code"
              required
              value={crud.formData.course_code}
              onChange={(v) => crud.setField('course_code', v)}
              placeholder="e.g. CRS-TS-02"
              style={{width: "50%"}}
            />
            <AdminInput
              label="Estimated Duration (Hours)"
              type="number"
              value={crud.formData.estimated_duration_hours}
              onChange={(v) => crud.setField('estimated_duration_hours', v)}
              style={{width: "50%"}}
            />
          </div>
          <div className="flex gap-2 align-center">
            <AdminSelect
              label="Category"
              required
              value={crud.formData.category}
              onChange={(v) => crud.setField('category', v)}
              options={categoryOptions}
              style={{width: "100%"}}
            />
            <AdminSelect
              label="Difficulty Level"
              required
              value={crud.formData.difficulty_level || ''}
              onChange={(v) => crud.setField('difficulty_level', v)}
              options={DIFFICULTY_OPTIONS}
              style={{width: "100%"}}
            />
          </div>
          <AdminInput
            label="Description"
            value={crud.formData.description}
            onChange={(v) => crud.setField('description', v)}
          />
          <AdminToggle
            label="Active Status"
            checked={crud.formData.is_active}
            onChange={(v) => crud.setField('is_active', v)}
          />
        </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default CourseMasterPage;
