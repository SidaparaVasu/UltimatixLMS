import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCourses, useCourseCategories, ADMIN_QUERY_KEYS } from '@/queries/admin/useAdminMasters';
import { courseApi } from '@/api/course-api';
import { CourseMaster } from '@/types/courses.types';
import { useAdminCRUD } from '@/hooks/admin/useAdminCRUD';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { CourseListCard } from '@/components/admin/CourseListCard';
import { AdminInput, AdminSelect, AdminToggle, DialogFooterActions } from '@/components/admin/form';
import { Dialog } from '@/components/ui/dialog';

/* ── Form shape ──────────────────────────────────────────────────────────── */
interface CourseForm {
  course_title: string;
  course_code: string;
  category: string;
  description: string;
  difficulty_level: CourseMaster['difficulty_level'] | string;
  estimated_duration_hours: string;
  start_date: string;
  end_date: string;
  show_marks_to_learners: boolean;
  is_active: boolean;
}

const EMPTY_FORM: CourseForm = {
  course_title: '',
  course_code: '',
  category: '',
  description: '',
  difficulty_level: 'BEGINNER',
  estimated_duration_hours: '0',
  start_date: '',
  end_date: '',
  show_marks_to_learners: false,
  is_active: true,
};

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER',     label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED',     label: 'Advanced' },
  { value: 'DOCTOR',       label: 'Expert' },
];

/* ── Page ────────────────────────────────────────────────────────────────── */
const CourseMasterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: response, isLoading } = useCourses({ page_size: 100 });
  const courses = response?.results || [];

  const { data: categoriesRes } = useCourseCategories({ page_size: 100 });
  const categories = categoriesRes?.results || [];
  const categoryOptions = categories.map((cat) => ({
    value: String(cat.id),
    label: cat.category_name,
  }));

  /* ── Mutations ── */
  const saveMutation = useMutation({
    mutationFn: (data: Partial<CourseMaster>) =>
      data.id ? courseApi.updateCourse(data.id, data) : courseApi.createCourse(data),
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

  /* ── CRUD hook ── */
  const crud = useAdminCRUD<CourseMaster, CourseForm>({
    emptyForm: EMPTY_FORM,
    mapToForm: (course) => ({
      course_title: course.course_title,
      course_code: course.course_code,
      category: String(course.category),
      description: course.description || '',
      difficulty_level: course.difficulty_level ?? 'BEGINNER',
      estimated_duration_hours: String(course.estimated_duration_hours),
      start_date: course.start_date ?? '',
      end_date: course.end_date ?? '',
      show_marks_to_learners: course.show_marks_to_learners ?? false,
      is_active: course.is_active,
    }),
  });

  /* ── Participants modal placeholder state ── */
  const [participantsCourseId, setParticipantsCourseId] = useState<number | null>(null);

  /* ── Search ── */
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = courses.filter((course) => {
    const q = searchTerm.toLowerCase();
    return (
      course.course_title.toLowerCase().includes(q) ||
      course.course_code.toLowerCase().includes(q)
    );
  });

  /* ── Save handler ── */
  const handleSave = () => {
    saveMutation.mutate({
      ...crud.formData,
      category: Number(crud.formData.category),
      estimated_duration_hours: Number(crud.formData.estimated_duration_hours),
      difficulty_level: crud.formData.difficulty_level as CourseMaster['difficulty_level'],
      start_date: crud.formData.start_date || null,
      end_date: crud.formData.end_date || null,
      show_marks_to_learners: crud.formData.show_marks_to_learners,
      id: crud.editingItem?.id,
    });
  };

  const isFormValid = !!(
    crud.formData.course_title?.trim() &&
    crud.formData.course_code?.trim() &&
    crud.formData.category?.trim()
  );

  /* ── Skeleton cards while loading ── */
  const SkeletonCard = () => (
    <div
      style={{
        height: '110px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <div style={{ width: '4px', background: 'var(--color-border)' }} />
      <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="skeleton" style={{ height: '16px', width: '200px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '16px', width: '80px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '16px', width: '70px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
        <div style={{ display: 'flex', gap: '12px' }}>
          {[60, 70, 65, 80].map((w, i) => (
            <div key={i} className="skeleton" style={{ height: '12px', width: `${w}px`, borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    </div>
  );

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
      resultCount={filteredData.length}
    >
      {/* ── Course list ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '15px' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filteredData.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-12)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            No courses found.
          </div>
        ) : (
          filteredData.map((course) => (
            <CourseListCard
              key={course.id}
              course={course}
              categoryName={categories.find((c) => c.id === course.category)?.category_name}
              onEdit={() => crud.openDialog(course)}
              onDelete={() => deleteMutation.mutate(course.id)}
              onBuild={() => navigate(`/admin/courses/builder/${course.id}`)}
              onParticipants={() => setParticipantsCourseId(course.id)}
            />
          ))
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={crud.isDialogOpen}
        onOpenChange={crud.closeDialog}
        title={crud.editingItem ? 'Edit Course' : 'Create New Course'}
        description="Define the core properties before building the content."
        maxWidth="560px"
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
          {/* Title */}
          <AdminInput
            label="Course Title"
            required
            value={crud.formData.course_title}
            onChange={(v) => crud.setField('course_title', v)}
            placeholder="e.g. Advanced TypeScript"
          />

          {/* Code + Duration */}
          <div className="flex gap-2">
            <AdminInput
              label="Course Code"
              required
              value={crud.formData.course_code}
              onChange={(v) => crud.setField('course_code', v)}
              placeholder="e.g. CRS-TS-02"
              style={{ width: '50%' }}
            />
            <AdminInput
              label="Duration (Hours)"
              type="number"
              value={crud.formData.estimated_duration_hours}
              onChange={(v) => crud.setField('estimated_duration_hours', v)}
              style={{ width: '50%' }}
            />
          </div>

          {/* Category + Difficulty */}
          <div className="flex gap-2">
            <AdminSelect
              label="Category"
              required
              value={crud.formData.category}
              onChange={(v) => crud.setField('category', v)}
              options={categoryOptions}
              style={{ width: '100%' }}
            />
            <AdminSelect
              label="Difficulty Level"
              value={crud.formData.difficulty_level || ''}
              onChange={(v) => crud.setField('difficulty_level', v)}
              options={DIFFICULTY_OPTIONS}
              style={{ width: '100%' }}
            />
          </div>

          {/* Description */}
          <AdminInput
            label="Description"
            value={crud.formData.description}
            onChange={(v) => crud.setField('description', v)}
            placeholder="Briefly describe what learners will gain..."
          />

          {/* Start + End date */}
          <div className="flex gap-2">
            <AdminInput
              label="Course Start Date"
              type="date"
              value={crud.formData.start_date}
              onChange={(v) => crud.setField('start_date', v)}
              style={{ width: '50%' }}
            />
            <AdminInput
              label="Course End Date"
              type="date"
              value={crud.formData.end_date}
              onChange={(v) => crud.setField('end_date', v)}
              style={{ width: '50%' }}
            />
          </div>

          {/* Show marks toggle */}
          <AdminToggle
            label="Show Marks to Learners"
            hint="Learners will see their assessment scores after completing the course."
            checked={crud.formData.show_marks_to_learners}
            onChange={(v) => crud.setField('show_marks_to_learners', v)}
          />

          {/* Active status toggle */}
          <AdminToggle
            label="Active Status"
            hint="Inactive courses are hidden from all learner views."
            checked={crud.formData.is_active}
            onChange={(v) => crud.setField('is_active', v)}
          />
        </div>
      </Dialog>

      {/* ── Participants modal placeholder ── */}
      <Dialog
        open={participantsCourseId !== null}
        onOpenChange={() => setParticipantsCourseId(null)}
        title="Invite Participants"
        description="Manage participants for this course."
        maxWidth="480px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setParticipantsCourseId(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>
        }
      >
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Participant invite UI will be implemented soon.
        </div>
      </Dialog>
    </AdminMasterLayout>
  );
};

export default CourseMasterPage;
