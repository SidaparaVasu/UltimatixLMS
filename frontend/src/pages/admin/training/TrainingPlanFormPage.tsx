import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trash2, AlertCircle } from 'lucide-react';
import {
  useTrainingPlan,
  useTrainingPlanItems,
  useCreatePlan,
  useUpdatePlan,
  useCreatePlanItem,
  useDeletePlanItem,
} from '@/queries/training/useTrainingQueries';
import { useSkills } from '@/queries/admin/useAdminMasters';
import { useDepartmentOptions } from '@/queries/admin/useAdminMasters';
import { useCourses } from '@/queries/admin/useAdminMasters';
import { TrainingPlanStatus, CreateTrainingPlanPayload } from '@/types/training.types';

// ── Status badge config ────────────────────────────────────────────────────

const STATUS_COLOR: Record<TrainingPlanStatus, string> = {
  DRAFT:            '#64748b',
  PENDING_APPROVAL: '#b45309',
  APPROVED:         '#15803d',
  ACTIVE:           '#2563eb',
  COMPLETED:        '#94a3b8',
};
const STATUS_BG: Record<TrainingPlanStatus, string> = {
  DRAFT:            'var(--color-surface-alt)',
  PENDING_APPROVAL: 'rgba(217,119,6,0.10)',
  APPROVED:         'rgba(21,128,61,0.10)',
  ACTIVE:           'rgba(37,99,235,0.10)',
  COMPLETED:        'var(--color-surface-alt)',
};

// ── Form state ─────────────────────────────────────────────────────────────

interface PlanForm {
  plan_name: string;
  year: string;
  department: string;
  training_category: string;
  training_provider: string;
  training_scope: string;
  selected_skills: number[];
  start_date: string;
  end_date: string;
  duration_hours: string;
  budget_per_employee: string;
}

const EMPTY_FORM: PlanForm = {
  plan_name: '',
  year: String(new Date().getFullYear()),
  department: '',
  training_category: '',
  training_provider: '',
  training_scope: '',
  selected_skills: [],
  start_date: '',
  end_date: '',
  duration_hours: '',
  budget_per_employee: '',
};

interface CourseItemRow {
  _key: string;
  id?: number;
  course: string;
  target_department: string;
  planned_participants: string;
  priority: string;
}

function buildPayload(form: PlanForm): CreateTrainingPlanPayload {
  return {
    plan_name: form.plan_name.trim(),
    year: Number(form.year),
    department: Number(form.department),
    training_category: form.training_category.trim() || undefined,
    training_provider: form.training_provider.trim() || undefined,
    training_scope: form.training_scope.trim() || undefined,
    skills: form.selected_skills.length ? form.selected_skills : undefined,
    budget_per_employee: form.budget_per_employee || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    duration_hours: form.duration_hours || null,
  };
}

// ── Section label ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '6px',
    marginBottom: '16px',
    marginTop: '8px',
  }}>
    {children}
  </div>
);

// ── Inline error ───────────────────────────────────────────────────────────

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <span style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '3px', display: 'block' }}>
      {msg}
    </span>
  ) : null;


// ── Main component ─────────────────────────────────────────────────────────

export default function TrainingPlanFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const planId = id ? Number(id) : null;
  const isEdit = !!planId;

  // ── Data fetching ──────────────────────────────────────────────────────
  const { data: plan, isLoading: planLoading } = useTrainingPlan(planId);
  const { data: itemsData } = useTrainingPlanItems(planId ?? 0);
  const { data: skillsData } = useSkills();
  const { data: deptOptions } = useDepartmentOptions();
  const { data: coursesData } = useCourses({ page_size: 200, is_active: true });

  const allSkills = skillsData?.results ?? [];
  const allDepts = deptOptions ?? [];
  const allCourses = coursesData?.results ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const createItem = useCreatePlanItem();
  const deleteItem = useDeletePlanItem(planId ?? 0);

  // ── Form state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [items, setItems] = useState<CourseItemRow[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof PlanForm | 'end_date_range', string>>>({});
  const [submitConfirm, setSubmitConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialFormRef = useRef<string>('');

  // ── Populate form on edit ──────────────────────────────────────────────
  useEffect(() => {
    if (plan) {
      const populated: PlanForm = {
        plan_name:          plan.plan_name,
        year:               String(plan.year),
        department:         String(plan.department),
        training_category:  plan.training_category ?? '',
        training_provider:  plan.training_provider ?? '',
        training_scope:     plan.training_scope ?? '',
        selected_skills:    plan.skills ?? [],
        start_date:         plan.start_date ?? '',
        end_date:           plan.end_date ?? '',
        duration_hours:     plan.duration_hours ?? '',
        budget_per_employee: plan.budget_per_employee ?? '',
      };
      setForm(populated);
      initialFormRef.current = JSON.stringify(populated);
    }
  }, [plan]);

  // ── Populate items on edit ─────────────────────────────────────────────
  useEffect(() => {
    if (itemsData?.results) {
      setItems(
        itemsData.results.map(item => ({
          _key:                String(item.id),
          id:                  item.id,
          course:              item.course != null ? String(item.course) : '',
          target_department:   String(item.target_department),
          planned_participants: String(item.planned_participants),
          priority:            item.priority,
        }))
      );
    }
  }, [itemsData]);

  // ── Dirty check ────────────────────────────────────────────────────────
  const isDirty = () => {
    if (!isEdit) return JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
    return JSON.stringify(form) !== initialFormRef.current;
  };

  // ── Field helpers ──────────────────────────────────────────────────────
  const setField = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const toggleSkill = (skillId: number) => {
    setForm(prev => ({
      ...prev,
      selected_skills: prev.selected_skills.includes(skillId)
        ? prev.selected_skills.filter(s => s !== skillId)
        : [...prev.selected_skills, skillId],
    }));
  };

  // ── Validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.plan_name.trim()) errs.plan_name = 'Plan name is required.';
    if (!form.year || isNaN(Number(form.year))) errs.year = 'Year is required.';
    if (!form.department) errs.department = 'Department is required.';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errs.end_date_range = 'End date must be after start date.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Read-only mode ─────────────────────────────────────────────────────
  const isReadOnly  = plan?.status === 'PENDING_APPROVAL' || plan?.status === 'APPROVED';
  const wasRejected = plan?.status === 'DRAFT' && !!plan?.last_rejection;
  const rejection   = plan?.last_rejection ?? null;

  // ── Save items helper ──────────────────────────────────────────────────
  const saveNewItems = async (savedPlanId: number) => {
    const newRows = items.filter(r => !r.id);
    for (const row of newRows) {
      if (!row.target_department) continue;
      await createItem.mutateAsync({
        training_plan:        savedPlanId,
        course:               row.course ? Number(row.course) : null,
        target_department:    Number(row.target_department),
        planned_participants: Number(row.planned_participants) || 0,
        priority:             (row.priority as any) || 'MEDIUM',
      });
    }
  };

  // ── Save as Draft ──────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = buildPayload(form);
      if (!isEdit) {
        const created = await createPlan.mutateAsync(payload);
        if (created?.id) {
          await saveNewItems(created.id);
          navigate(`/admin/training-plans/${created.id}/edit`, { replace: true });
        }
      } else {
        await updatePlan.mutateAsync({ id: planId!, payload });
        await saveNewItems(planId!);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Submit for Review ──────────────────────────────────────────────────
  const handleSubmitForReview = async () => {
    if (!validate()) return;
    setSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSaving(true);
    setSubmitConfirm(false);
    try {
      const payload = buildPayload(form);
      if (!isEdit) {
        const created = await createPlan.mutateAsync(payload);
        if (created?.id) {
          await saveNewItems(created.id);
          await updatePlan.mutateAsync({ id: created.id, payload: { status: 'PENDING_APPROVAL' } });
        }
      } else {
        await updatePlan.mutateAsync({ id: planId!, payload });
        await saveNewItems(planId!);
        await updatePlan.mutateAsync({ id: planId!, payload: { status: 'PENDING_APPROVAL' } });
      }
      navigate('/admin/training-plans');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cancel ─────────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (isDirty()) {
      if (!window.confirm('Unsaved changes. Leave anyway?')) return;
    }
    navigate('/admin/training-plans');
  };

  // ── Course items ───────────────────────────────────────────────────────
  const addItem = () => {
    setItems(prev => [
      ...prev,
      { _key: `new-${Date.now()}`, course: '', target_department: '', planned_participants: '', priority: 'MEDIUM' },
    ]);
  };

  const updateItem = (key: string, field: keyof CourseItemRow, value: string) => {
    setItems(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));
  };

  const removeItem = async (row: CourseItemRow) => {
    if (row.id) {
      await deleteItem.mutateAsync(row.id);
    }
    setItems(prev => prev.filter(r => r._key !== row._key));
  };

  // ── Status badge ───────────────────────────────────────────────────────
  const currentStatus: TrainingPlanStatus = plan?.status ?? 'DRAFT';

  if (isEdit && planLoading) {
    return (
      <div className="content-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="content-inner" style={{ background: 'white', borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)' }}>

      {/* Back link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/admin/training-plans"
          style={{
            fontSize: '13px', color: 'var(--color-text-muted)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          ← Back to Training Plans
        </Link>
      </div>

      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {['Admin', 'Training Plans', isEdit ? (plan?.plan_name ?? 'Edit') : 'New'].map((crumb, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>/</span>}
              <span style={{ fontSize: '11px', fontWeight: i === arr.length - 1 ? 500 : 400, color: i === arr.length - 1 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {isEdit ? `Edit: ${plan?.plan_name ?? ''}` : 'New Training Plan'}
        </h1>
        <hr style={{ marginTop: '16px', border: 'none', borderTop: '1px solid var(--color-border)' }} />
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
        <div style={{
          background: 'rgba(217,119,6,0.08)',
          border: '1px solid rgba(217,119,6,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#b45309',
          fontWeight: 500,
        }}>
          This plan is in <strong>{currentStatus.replace('_', ' ')}</strong> status and cannot be edited.
        </div>
      )}

      {/* Rejection banner — shown when plan is back to DRAFT after being rejected */}
      {plan?.status === 'DRAFT' && plan?.last_rejection && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            background: 'rgba(220, 38, 38, 0.05)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '20px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(220,38,38,0.1)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={16} style={{ color: '#dc2626' }} />
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {/* Title */}
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: '#991b1b',
              }}
            >
              Plan Rejected
            </p>

            {/* Reason */}
            {plan.last_rejection.comments && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ fontWeight: 500 }}>Reason:</span>{' '}
                {plan.last_rejection.comments}
              </p>
            )}

            {/* Meta Info */}
            {(plan.last_rejection.approver_name ||
              plan.last_rejection.rejected_at) && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}
              >
                {plan.last_rejection.approver_name && (
                  <>
                    Rejected by{' '}
                    <strong style={{ color: '#991b1b' }}>
                      {plan.last_rejection.approver_name}
                    </strong>
                  </>
                )}
                {plan.last_rejection.rejected_at && (
                  <>
                    {' '}
                    on{' '}
                    {new Date(
                      plan.last_rejection.rejected_at
                    ).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </>
                )}
              </p>
            )}

            {/* Action Hint */}
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              Please update the plan and resubmit for review.
            </p>
          </div>
        </div>
      )}

      {/* ── Plan Name + Year ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '66% 34%', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">
            Plan Name <span className="input-requied"> *</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={form.plan_name}
            onChange={e => setField('plan_name', e.target.value)}
            disabled={isReadOnly}
            placeholder="e.g. Annual Technical Training 2025"
            style={{ width: '100%', borderColor: errors.plan_name ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.plan_name} />
        </div>
        <div className="form-group">
          <label className="form-label">
            Year <span className="input-requied"> *</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={form.year}
            onChange={e => setField('year', e.target.value)}
            disabled={isReadOnly}
            min={2000}
            max={2100}
            style={{ width: '100%', borderColor: errors.year ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.year} />
        </div>
      </div>

      {/* ── Department + Category + Provider ── */}
      <div style={{ display: 'inline-flex', gap: '16px' }}>
        <div className="form-group w-full">
          <label className="form-label">Training Category</label>
          <input
            type="text"
            className="form-input"
            value={form.training_category}
            onChange={e => setField('training_category', e.target.value)}
            disabled={isReadOnly}
            placeholder="e.g. Technical, Soft Skills"
            style={{ width: '100%' }}
          />
        </div>
        <div className="form-group w-full">
          <label className="form-label">Training Provider</label>
          <input
            type="text"
            className="form-input"
            value={form.training_provider}
            onChange={e => setField('training_provider', e.target.value)}
            disabled={isReadOnly}
            placeholder="e.g. Internal, Coursera"
            style={{ width: '100%' }}
          />
        </div>
        <div className="form-group w-full">
          <label className="form-label">
            Target Department <span className="input-requied"> *</span>
          </label>
          <select
            className="form-input"
            value={form.department}
            onChange={e => setField('department', e.target.value)}
            disabled={isReadOnly}
            style={{ width: '100%', cursor: isReadOnly ? 'not-allowed' : 'pointer', borderColor: errors.department ? 'var(--color-danger)' : undefined }}
          >
            <option value="" disabled>Select Department…</option>
            {allDepts.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          <FieldError msg={errors.department} />
        </div>
      </div>

      {/* ── Scope & Skills ── */}
      <SectionLabel>Training Scope &amp; Skills</SectionLabel>

      <div className="form-group">
        <label className="form-label">Training Scope</label>
        <textarea
          className="form-input"
          rows={4}
          value={form.training_scope}
          onChange={e => setField('training_scope', e.target.value)}
          disabled={isReadOnly}
          placeholder="Describe the scope and objectives of this training plan…"
          style={{ width: '100%', resize: 'vertical', height: 'auto', minHeight: '96px', padding: 'var(--space-2) var(--space-3)' }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Skills This Plan Addresses 
          <span className='ml-1 text-xs text-slate-500'>(select skills)</span>
        </label>
        {allSkills.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No skills available.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {allSkills.map(skill => {
              const selected = form.selected_skills.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => !isReadOnly && toggleSkill(skill.id)}
                  disabled={isReadOnly}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: isReadOnly ? 'default' : 'pointer',
                    border: selected ? '1px solid rgba(37,99,235,0.30)' : '1px solid var(--color-border)',
                    background: selected ? 'rgba(37,99,235,0.10)' : 'var(--color-surface)',
                    color: selected ? '#2563eb' : 'var(--color-text-secondary)',
                    transition: 'all 150ms ease',
                  }}
                >
                  {skill.skill_name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Schedule & Budget ── */}
      <SectionLabel>Training Schedule &amp; Budget</SectionLabel>

      <div style={{ display: 'inline-flex', gap: '16px' }}>
        <div className="form-group w-full">
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="form-input"
            value={form.start_date}
            onChange={e => { setField('start_date', e.target.value); setErrors(prev => ({ ...prev, end_date_range: undefined })); }}
            disabled={isReadOnly}
          />
        </div>
        <div className="form-group w-full">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-input"
            value={form.end_date}
            onChange={e => { setField('end_date', e.target.value); setErrors(prev => ({ ...prev, end_date_range: undefined })); }}
            disabled={isReadOnly}
            style={{ borderColor: errors.end_date_range ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.end_date_range} />
        </div>
        <div className="form-group w-full">
          <label className="form-label">Duration (hours)</label>
          <input
            type="number"
            className="form-input"
            value={form.duration_hours}
            onChange={e => setField('duration_hours', e.target.value)}
            disabled={isReadOnly}
            min={0}
            placeholder='e.g. 70'
          />
        </div>
        <div className="form-group w-full">
          <label className="form-label">Budget per Employee (₹)</label>
          <input
            type="number"
            className="form-input"
            value={form.budget_per_employee}
            onChange={e => setField('budget_per_employee', e.target.value)}
            disabled={isReadOnly}
            min={0}
            placeholder='1250'
          />
        </div>
      </div>

      {/* ── Course Items ── */}
      <SectionLabel>Course Items</SectionLabel>

      {!isEdit ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '12px' }}>
          Save the plan first to add course items.
        </p>
      ) : (
        <>
          {items.length > 0 && (
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: '12px',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Course', 'Target Dept', 'Participants', 'Priority', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '8px 12px', textAlign: 'left',
                        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr key={row._key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          className="form-input"
                          value={row.course}
                          onChange={e => updateItem(row._key, 'course', e.target.value)}
                          disabled={isReadOnly}
                          style={{ width: '100%', minWidth: '160px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="">— Select Course —</option>
                          {allCourses.map(c => (
                            <option key={c.id} value={String(c.id)}>{c.course_title}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          className="form-input"
                          value={row.target_department}
                          onChange={e => updateItem(row._key, 'target_department', e.target.value)}
                          disabled={isReadOnly}
                          style={{ width: '100%', minWidth: '140px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="">— Select Dept —</option>
                          {allDepts.map(d => (
                            <option key={d.id} value={String(d.id)}>{d.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={row.planned_participants}
                          onChange={e => updateItem(row._key, 'planned_participants', e.target.value)}
                          disabled={isReadOnly}
                          min={0}
                          style={{ width: '80px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          className="form-input"
                          value={row.priority}
                          onChange={e => updateItem(row._key, 'priority', e.target.value)}
                          disabled={isReadOnly}
                          style={{ width: '100px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeItem(row)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--color-danger)', padding: '4px',
                              display: 'inline-flex', alignItems: 'center',
                            }}
                            title="Remove row"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isReadOnly && (
            <button
              type="button"
              onClick={addItem}
              style={{
                fontSize: '13px', fontWeight: 600,
                color: 'var(--color-accent)',
                background: 'none', border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 16px',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            >
              + Add Item
            </button>
          )}
        </>
      )}

      {/* ── Sticky footer ── */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 10,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '32px',
      }}>
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>STATUS:</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '3px 10px',
            fontSize: '11px', fontWeight: 600,
            color: STATUS_COLOR[currentStatus],
            background: STATUS_BG[currentStatus],
          }}>
            {currentStatus.replace('_', ' ')}
          </span>
        </div>

        {/* Action buttons */}
        {!isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'transparent', color: 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-alt)', color: 'var(--color-text-primary)',
                fontSize: '13px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              Save as Draft
            </button>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isSaving}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-accent)', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                Submit for Review →
              </button>
              {submitConfirm && (
                <div style={{
                  position: 'absolute', bottom: '44px', right: 0,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  zIndex: 20,
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                      border: 'none', background: 'var(--color-accent)', color: '#fff',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmitConfirm(false)}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)', background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
