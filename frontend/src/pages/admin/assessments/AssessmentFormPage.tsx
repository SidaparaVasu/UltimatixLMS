import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus, Loader2, Database,
  CheckCircle2, AlertCircle, BookOpen, Shuffle, Lock,
} from 'lucide-react';
import {
  useStandaloneAssessmentDetail,
  useCreateStandaloneAssessment,
  useUpdateStandaloneAssessment,
  useQuestionMappings,
  useCheckAvailabilityPreview,
} from '@/queries/admin/useStandaloneAssessmentQueries';
import { useSkills, useSkillLevels } from '@/queries/admin/useAdminMasters';
import { standaloneAssessmentApi } from '@/api/standalone-assessment-api';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  AssessmentFormValues,
  SkillMappingRow,
  QuestionSelectionMode,
  StagedQuestion,
  QuestionMappingItem,
  QuestionAvailability,
} from '@/types/standalone-assessment.types';
import { SkillMappingRowItem, SkillMappingFormRow } from '@/components/admin/assessments/SkillMappingRow';
import { QuestionPickerDrawer } from '@/components/admin/assessments/QuestionPickerDrawer';
import { AutoSuggestPanel } from '@/components/admin/assessments/AutoSuggestPanel';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// ── Mode selector config ──────────────────────────────────────────────────────

const MODE_OPTIONS: Array<{
  value: QuestionSelectionMode;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: 'CURATED',
    label: 'Curated',
    description: 'You manually select questions from the bank',
    icon: BookOpen,
  },
  {
    value: 'DYNAMIC',
    label: 'System Picked',
    description: 'Algorithm picks questions per attempt',
    icon: Shuffle,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '6px',
    marginBottom: '16px',
    ...style, // Override with custom styles if provided
  }}>
    {children}
  </div>
);

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <span style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '3px', display: 'block' }}>{msg}</span> : null;

const genKey = () => Math.random().toString(36).slice(2, 9);

// ── Default form ──────────────────────────────────────────────────────────────

const EMPTY_FORM: AssessmentFormValues = {
  title: '',
  description: '',
  question_selection_mode: 'DYNAMIC',
  number_of_questions: 20,
  duration_minutes: 30,
  passing_percentage: 60,
  retake_limit: 2,
  retake_cooldown_hours: 24,
  is_randomized: true,
  negative_marking_enabled: false,
  negative_marking_percentage: 0,
  status: 'DRAFT',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showNotification = useNotificationStore(s => s.showNotification);

  const assessmentId = id ? Number(id) : null;
  const isEdit = !!assessmentId;

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: assessment, isLoading: detailLoading } = useStandaloneAssessmentDetail(assessmentId);
  const { data: skillsRes } = useSkills();
  const { data: levelsRes } = useSkillLevels();

  const skillOptions = (skillsRes?.results ?? []).map((s: any) => ({
    value: String(s.id), label: s.skill_name,
  }));
  const levelOptions = (levelsRes?.results ?? []).map((l: any) => ({
    value: String(l.id), label: l.level_name,
  }));

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createAssessment = useCreateStandaloneAssessment();
  const updateAssessment = useUpdateStandaloneAssessment(assessmentId ?? 0);
  const checkPreview     = useCheckAvailabilityPreview();

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<AssessmentFormValues>(EMPTY_FORM);
  const [skillRows, setSkillRows] = useState<SkillMappingFormRow[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof AssessmentFormValues | 'skill_mappings' | 'questions', string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // ── CURATED: question picker state ────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stagedQuestions, setStagedQuestions] = useState<StagedQuestion[]>([]);

  // ── Mode switch confirmation (edit DRAFT only) ────────────────────────────
  const [pendingMode, setPendingMode]           = useState<QuestionSelectionMode | null>(null);
  const [modeConfirmOpen, setModeConfirmOpen]   = useState(false);

  // ── Availability: preview result (create + edit) ──────────────────────────
  const [previewAvailability, setPreviewAvailability] = useState<QuestionAvailability | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── CURATED: existing question mappings (saved to DB) ─────────────────────
  const { data: existingMappingsData } = useQuestionMappings(
    isEdit && form.question_selection_mode === 'CURATED' ? assessmentId : null
  );
  const existingMappings: QuestionMappingItem[] = existingMappingsData ?? [];

  // ── hasSkillMappings — used by availability preview and AutoSuggestPanel ──
  const hasSkillMappings = skillRows.some(r => r.skill && r.skill_level);

  // ── Populate on edit ──────────────────────────────────────────────────────
  useEffect(() => {
    if (assessment) {
      setForm({
        title:                      assessment.title,
        description:                assessment.description,
        question_selection_mode:    assessment.question_selection_mode,
        number_of_questions:        assessment.number_of_questions,
        duration_minutes:           assessment.duration_minutes,
        passing_percentage:         parseFloat(assessment.passing_percentage),
        retake_limit:               assessment.retake_limit,
        retake_cooldown_hours:      assessment.retake_cooldown_hours,
        is_randomized:              assessment.is_randomized,
        negative_marking_enabled:   assessment.negative_marking_enabled,
        negative_marking_percentage: parseFloat(assessment.negative_marking_percentage),
        status:                     assessment.status,
      });
      setSkillRows(
        (assessment.skill_mappings ?? []).map((m: SkillMappingRow) => ({
          _key:        String(m.id ?? genKey()),
          id:          m.id,
          skill:       String(m.skill),
          skill_level: String(m.skill_level),
        }))
      );
    }
  }, [assessment]);

  // ── Field helpers ─────────────────────────────────────────────────────────
  const setField = <K extends keyof AssessmentFormValues>(key: K, value: AssessmentFormValues[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // ── Skill mapping handlers ────────────────────────────────────────────────
  const addSkillRow = () => {
    setSkillRows(prev => [...prev, { _key: genKey(), skill: '', skill_level: '' }]);
  };

  const updateSkillRow = (key: string, field: 'skill' | 'skill_level', value: string) => {
    setSkillRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));
  };

  const removeSkillRow = (key: string) => {
    setSkillRows(prev => prev.filter(r => r._key !== key));
  };

  // ── CURATED: keep number_of_questions in sync with staged count ──────────
  useEffect(() => {
    if (form.question_selection_mode === 'CURATED') {
      const count = stagedQuestions.length > 0
        ? stagedQuestions.length
        : existingMappings.length;
      if (count > 0 && count !== form.number_of_questions) {
        setForm(prev => ({ ...prev, number_of_questions: count }));
      }
    }
  }, [stagedQuestions.length, existingMappings.length, form.question_selection_mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Availability preview — fires whenever skill mappings or question count changes
  // Works in both create and edit mode. Debounced 500ms to avoid hammering the API.
  useEffect(() => {
    const validRows = skillRows.filter(r => r.skill && r.skill_level);
    if (validRows.length === 0) {
      setPreviewAvailability(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkPreview.mutate(
        {
          skill_mappings: validRows.map(r => ({
            skill:       parseInt(r.skill, 10),
            skill_level: parseInt(r.skill_level, 10),
          })),
          number_of_questions: form.number_of_questions,
        },
        {
          onSuccess: (data) => {
            if (data) setPreviewAvailability(data as QuestionAvailability);
          },
        },
      );
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [skillRows, form.number_of_questions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mode change handler — confirmation required when switching away from CURATED on edit
  const handleModeChange = (newMode: QuestionSelectionMode) => {
    if (newMode === form.question_selection_mode) return;

    // On edit: if current mode is CURATED and has mapped questions, warn before switching
    const hasMappedQuestions = existingMappings.length > 0 || stagedQuestions.length > 0;
    if (isEdit && form.question_selection_mode === 'CURATED' && hasMappedQuestions) {
      setPendingMode(newMode);
      setModeConfirmOpen(true);
      return;
    }

    setField('question_selection_mode', newMode);
    // Clear staged questions when switching away from CURATED
    if (newMode !== 'CURATED') setStagedQuestions([]);
  };

  const handleModeConfirm = async () => {
    if (!pendingMode) return;
    setModeConfirmOpen(false);

    // Delete all existing CURATED question mappings from DB
    if (isEdit && assessmentId) {
      for (const mapping of existingMappings) {
        await standaloneAssessmentApi.removeQuestionMapping(mapping.id);
      }
    }

    setStagedQuestions([]);
    setField('question_selection_mode', pendingMode);
    setPendingMode(null);
  };
  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.duration_minutes || form.duration_minutes < 1) errs.duration_minutes = 'Must be at least 1 minute.';
    if (form.passing_percentage < 0 || form.passing_percentage > 100) errs.passing_percentage = 'Must be between 0 and 100.';
    if (form.retake_limit < 1) errs.retake_limit = 'Must be at least 1.';
    if (skillRows.some(r => !r.skill || !r.skill_level)) errs.skill_mappings = 'All skill mappings must have a skill and level selected.';
    const skillIds = skillRows.map(r => r.skill).filter(Boolean);
    if (new Set(skillIds).size !== skillIds.length) errs.skill_mappings = 'Each skill can only be mapped once.';

    // DYNAMIC: number_of_questions must be set
    if (form.question_selection_mode === 'DYNAMIC') {
      if (!form.number_of_questions || form.number_of_questions < 1) errs.number_of_questions = 'Must be at least 1.';
    }

    // CURATED: must have questions staged or saved before publishing
    if (form.question_selection_mode === 'CURATED') {
      const totalMapped = stagedQuestions.length > 0
        ? stagedQuestions.length
        : existingMappings.length;
      if (totalMapped === 0) {
        errs.questions = 'Add at least one question before saving a Curated assessment.';
      }
      if (form.status === 'PUBLISHED' && totalMapped !== form.number_of_questions && form.number_of_questions > 0) {
        errs.questions = `Cannot publish: ${totalMapped} question(s) mapped but ${form.number_of_questions} required. Adjust the question count or add more questions.`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    try {
      let savedId = assessmentId;

      if (!isEdit) {
        const created = await createAssessment.mutateAsync(form);
        if (!created) { setIsSaving(false); return; }
        savedId = created.id;
      } else {
        await updateAssessment.mutateAsync(form);
      }

      if (savedId) {
        await reconcileSkillMappings(savedId);

        // Reconcile question mappings for CURATED mode
        if (form.question_selection_mode === 'CURATED') {
          await reconcileQuestionMappings(savedId);
        }
      }

      showNotification(
        isEdit ? 'Assessment updated successfully.' : 'Assessment created successfully.',
        'success',
      );
      navigate('/admin/assessments');
    } catch {
      showNotification('Failed to save assessment. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Skill mapping reconciliation ──────────────────────────────────────────
  const reconcileSkillMappings = async (savedAssessmentId: number) => {
    const originalIds = new Set(
      (assessment?.skill_mappings ?? []).map((m: SkillMappingRow) => m.id).filter(Boolean)
    );
    const currentIds = new Set(
      skillRows.filter(r => r.id).map(r => r.id)
    );

    for (const id of originalIds) {
      if (!currentIds.has(id)) {
        await standaloneAssessmentApi.deleteSkillMapping(id!);
      }
    }

    for (const row of skillRows) {
      if (!row.id && row.skill && row.skill_level) {
        await standaloneAssessmentApi.addSkillMapping({
          assessment: savedAssessmentId,
          skill: parseInt(row.skill, 10),
          skill_level: parseInt(row.skill_level, 10),
        });
      }
    }
  };

  // ── Question mapping reconciliation (CURATED mode) ────────────────────────
  const reconcileQuestionMappings = async (savedAssessmentId: number) => {
    // Nothing staged — no changes to make
    if (stagedQuestions.length === 0) return;

    const existingById = new Map(existingMappings.map(m => [m.question, m]));
    const stagedIds    = new Set(stagedQuestions.map(s => s.questionId));

    // 1. Delete mappings that were removed from the staged list
    for (const mapping of existingMappings) {
      if (!stagedIds.has(mapping.question)) {
        await standaloneAssessmentApi.removeQuestionMapping(mapping.id);
      }
    }

    // 2. Add new mappings (questions in staged that don't exist yet)
    //    and collect IDs of existing ones that need reordering
    const toReorder: Array<{ id: number; display_order: number }> = [];

    for (const staged of stagedQuestions) {
      const existing = existingById.get(staged.questionId);
      if (!existing) {
        // New question — add it
        await standaloneAssessmentApi.addQuestionMapping({
          assessment:    savedAssessmentId,
          question:      staged.questionId,
          display_order: staged.display_order,
        });
      } else if (existing.display_order !== staged.display_order) {
        // Existing question with changed order
        toReorder.push({ id: existing.id, display_order: staged.display_order });
      }
    }

    // 3. Bulk-update display_order for reordered questions
    if (toReorder.length > 0) {
      await standaloneAssessmentApi.reorderQuestionMappings({ mappings: toReorder });
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isEdit && detailLoading) {
    return (
      <div className="content-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="content-inner" style={{ paddingBottom: 'var(--space-16)' }}>

      {/* Back link */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/admin/assessments"
          style={{ fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          ← Back to Assessments
        </Link>
      </div>

      {/* Page header */}
      <div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {['Admin', 'Assessments', isEdit ? (assessment?.title ?? 'Edit') : 'New Assessment'].map((crumb, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>/</span>}
              <span style={{ fontSize: '11px', fontWeight: i === arr.length - 1 ? 500 : 400, color: i === arr.length - 1 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {isEdit ? `Edit: ${assessment?.title ?? ''}` : 'New Assessment'}
        </h1>
        <hr style={{ marginTop: '16px', border: 'none', borderTop: '1px solid var(--color-border)' }} />
      </div>

      {/* ── Section 1: Basic Info ── */}
      <SectionLabel style={{ marginTop: '24px' }}>Basic Information</SectionLabel>

      <div className="form-group">
        <label className="form-label">
          Title <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input
          type="text"
          className="form-input"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          placeholder="e.g. Python Fundamentals Assessment"
          style={{ borderColor: errors.title ? 'var(--color-danger)' : undefined }}
        />
        <FieldError msg={errors.title} />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input"
          rows={4}
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Brief description of what this assessment evaluates..."
          style={{ resize: 'vertical', minHeight: '72px', padding: '10px' }}
        />
      </div>

      {/* ── Section 2: Settings ── */}
      <SectionLabel>Assessment Settings</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">
            Number of Questions <span style={{ color: 'var(--color-danger)' }}>*</span>
            {form.question_selection_mode === 'CURATED' && (
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                (derived from selected questions)
              </span>
            )}
          </label>
          <input
            type="number"
            className="form-input"
            value={form.number_of_questions}
            onChange={e => setField('number_of_questions', parseInt(e.target.value, 10) || 0)}
            min={1}
            readOnly={form.question_selection_mode === 'CURATED'}
            style={{
              borderColor: errors.number_of_questions ? 'var(--color-danger)' : undefined,
              background: form.question_selection_mode === 'CURATED' ? 'var(--color-surface-alt)' : undefined,
              cursor: form.question_selection_mode === 'CURATED' ? 'default' : undefined,
            }}
          />
          <FieldError msg={errors.number_of_questions} />
        </div>

        <div className="form-group">
          <label className="form-label">
            Duration (minutes) <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={form.duration_minutes}
            onChange={e => setField('duration_minutes', parseInt(e.target.value, 10) || 0)}
            min={1}
            style={{ borderColor: errors.duration_minutes ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.duration_minutes} />
        </div>

        <div className="form-group">
          <label className="form-label">
            Passing Percentage (%) <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={form.passing_percentage}
            onChange={e => setField('passing_percentage', parseFloat(e.target.value) || 0)}
            min={0} max={100} step={0.5}
            style={{ borderColor: errors.passing_percentage ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.passing_percentage} />
        </div>

        <div className="form-group">
          <label className="form-label">
            Retake Limit <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={form.retake_limit}
            onChange={e => setField('retake_limit', parseInt(e.target.value, 10) || 1)}
            min={1}
            style={{ borderColor: errors.retake_limit ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.retake_limit} />
        </div>

        <div className="form-group">
          <label className="form-label">
            Cooldown After Fail (hours)
            <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>0 = no cooldown</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={form.retake_cooldown_hours}
            onChange={e => setField('retake_cooldown_hours', parseInt(e.target.value, 10) || 0)}
            min={0}
          />
        </div>
      </div>

      {/* Toggles row */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
        {/* Randomize */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div
            onClick={() => setField('is_randomized', !form.is_randomized)}
            style={{
              width: '40px', height: '22px', borderRadius: '999px',
              background: form.is_randomized ? 'var(--color-accent)' : 'var(--color-border)',
              position: 'relative', cursor: 'pointer', transition: 'background 200ms',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: form.is_randomized ? '21px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', transition: 'left 200ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Randomize Questions</p>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>Shuffle question order for each attempt</p>
          </div>
        </label>

        {/* Negative marking */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div
            onClick={() => setField('negative_marking_enabled', !form.negative_marking_enabled)}
            style={{
              width: '40px', height: '22px', borderRadius: '999px',
              background: form.negative_marking_enabled ? 'var(--color-accent)' : 'var(--color-border)',
              position: 'relative', cursor: 'pointer', transition: 'background 200ms',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: form.negative_marking_enabled ? '21px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', transition: 'left 200ms',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Negative Marking</p>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>Deduct points for wrong answers</p>
          </div>
        </label>
      </div>

      {/* Negative marking percentage — shown only when enabled */}
      {form.negative_marking_enabled && (
        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">
            Deduction Percentage (%)
          </label>
          <input
            type="number"
            className="form-input"
            value={form.negative_marking_percentage}
            onChange={e => setField('negative_marking_percentage', parseFloat(e.target.value) || 0)}
            min={0} max={100} step={0.5}
            placeholder="e.g. 25"
          />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px', display: 'block' }}>
            % of question weight deducted per wrong answer
          </span>
        </div>
      )}

      {/* ── Section 2b: Question Selection Mode ── */}
      {/* Shown on create, on DRAFT edit (editable), and on non-DRAFT edit (read-only badge) */}
      <SectionLabel style={{ marginTop: '24px' }}>Question Selection Mode</SectionLabel>

      {/* Non-DRAFT edit: locked read-only badge */}
      {isEdit && assessment?.status !== 'DRAFT' ? (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)',
          marginBottom: 'var(--space-2)',
        }}>
          {(() => {
            const opt = MODE_OPTIONS.find(o => o.value === form.question_selection_mode);
            const Icon = opt?.icon ?? BookOpen;
            return (
              <>
                <Icon size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {opt?.label ?? form.question_selection_mode}
                </span>
              </>
            );
          })()}
          <Lock size={13} style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Locked — mode cannot be changed on a {assessment?.status?.toLowerCase()} assessment
          </span>
        </div>
      ) : (
        /* Create or DRAFT edit: interactive selector */
        <>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', marginTop: '-8px' }}>
            {isEdit
              ? 'You can change the mode while this assessment is in Draft.'
              : 'Choose how questions are selected. This can only be changed while the assessment is in Draft.'
            }
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            {MODE_OPTIONS.map(opt => {
              const isSelected = form.question_selection_mode === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleModeChange(opt.value)}
                  style={{
                    flex: 1, minWidth: '180px',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: '6px', padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: isSelected
                      ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))'
                      : 'var(--color-surface)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 150ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                      {opt.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Section 2c: Questions (CURATED mode) ── */}
      {form.question_selection_mode === 'CURATED' && (
        <>
          <SectionLabel style={{ marginTop: '24px' }}>Questions</SectionLabel>

          {/* Existing saved mappings summary */}
          {isEdit && existingMappings.length > 0 && stagedQuestions.length === 0 && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  <strong>{existingMappings.length}</strong> question{existingMappings.length !== 1 ? 's' : ''} currently mapped
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Database size={13} />
                Edit Questions
              </button>
            </div>
          )}

          {/* Staged questions summary (pending save) */}
          {stagedQuestions.length > 0 && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(37,99,235,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={15} style={{ color: '#1d4ed8', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  <strong>{stagedQuestions.length}</strong> question{stagedQuestions.length !== 1 ? 's' : ''} staged
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                    (will be saved when you click Save)
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Edit
              </button>
            </div>
          )}

          {/* Auto-suggest panel */}
          {assessmentId && (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <AutoSuggestPanel
                assessmentId={assessmentId}
                hasSkillMappings={hasSkillMappings}
                onAccept={(staged) => {
                  setStagedQuestions(staged);
                  showNotification(`${staged.length} question${staged.length !== 1 ? 's' : ''} accepted from suggestions.`, 'success');
                }}
              />
            </div>
          )}

          {/* Add questions button (shown when nothing staged yet) */}
          {stagedQuestions.length === 0 && existingMappings.length === 0 && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)', background: 'transparent',
                color: 'var(--color-accent)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-accent) 5%, transparent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Plus size={14} />
              Add Questions
            </button>
          )}

          {errors.questions && (
            <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: 'var(--space-2)' }}>
              {errors.questions}
            </p>
          )}
        </>
      )}

      {/* ── Section 3: Skill Mappings ── */}
      <SectionLabel style={{ marginTop: '24px' }}>Skill Mappings</SectionLabel>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', marginTop: '-8px' }}>
        Map this assessment to one or more skills. Learners who pass will receive a skill upgrade proposal for each mapped skill.
      </p>

      {skillRows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {skillRows.map(row => (
            <SkillMappingRowItem
              key={row._key}
              row={row}
              skillOptions={skillOptions}
              skillLevelOptions={levelOptions}
              onChange={updateSkillRow}
              onRemove={removeSkillRow}
            />
          ))}
        </div>
      )}

      {errors.skill_mappings && (
        <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
          {errors.skill_mappings}
        </p>
      )}

      <button
        type="button"
        onClick={addSkillRow}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-border)', background: 'transparent',
          color: 'var(--color-accent)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'; (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-accent) 5%, transparent)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <Plus size={14} />
        Add Skill Mapping
      </button>

      {/* ── Availability indicator — shown after skill mappings for all modes ── */}
      {previewAvailability && (
        <div style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${previewAvailability.sufficient ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
          background: previewAvailability.sufficient ? 'rgba(22,163,74,0.04)' : 'rgba(220,38,38,0.04)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          {previewAvailability.sufficient
            ? <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0, marginTop: '1px' }} />
            : <AlertCircle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
          }
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: previewAvailability.sufficient ? '#15803d' : '#dc2626' }}>
              {previewAvailability.sufficient
                ? `${previewAvailability.available} questions available (need ${previewAvailability.required})`
                : `Only ${previewAvailability.available} questions available — need ${previewAvailability.required}`
              }
            </p>
            {!previewAvailability.sufficient && (
              <>
                {previewAvailability.breakdown.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {previewAvailability.breakdown.map((b, i) => (
                      <span key={i} style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                        background: b.available === 0 ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                        color: b.available === 0 ? '#dc2626' : '#b45309',
                      }}>
                        {b.skill} · {b.target_level_name}: {b.available} available
                      </span>
                    ))}
                  </div>
                )}
                {form.question_selection_mode === 'DYNAMIC' && (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#b45309' }}>
                    Consider switching to <strong>Curated</strong> mode to manually select from available questions.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Section 4: Status ── */}
      <SectionLabel style={{ marginTop: '24px' }}>Publication Status</SectionLabel>

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map(s => {
          const isSelected = form.status === s;
          const colors: Record<string, { bg: string; border: string; text: string }> = {
            DRAFT:    { bg: 'var(--color-surface-alt)', border: 'var(--color-border)', text: 'var(--color-text-muted)' },
            PUBLISHED: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.35)', text: '#15803d' },
            ARCHIVED:  { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.35)', text: '#475569' },
          };
          const c = colors[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setField('status', s)}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-md)',
                border: `2px solid ${isSelected ? c.border : 'var(--color-border)'}`,
                background: isSelected ? c.bg : 'transparent',
                color: isSelected ? c.text : 'var(--color-text-muted)',
                fontSize: '13px', fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
        Only <strong>Published</strong> assessments are visible to learners in the catalog.
      </p>

      {/* ── Action bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)',
        marginTop: 'var(--space-8)',
        paddingTop: 'var(--space-5)',
        borderTop: '1px solid var(--color-border)',
      }}>
        <button
          type="button"
          onClick={() => navigate('/admin/assessments')}
          style={{
            padding: '9px 20px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 24px', borderRadius: 'var(--radius-md)',
            border: 'none', background: 'var(--color-accent)', color: '#fff',
            fontSize: '13px', fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Assessment'}
        </button>
      </div>

      {/* ── Question Picker Drawer (CURATED mode) ── */}
      {form.question_selection_mode === 'CURATED' && (
        <QuestionPickerDrawer
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          assessmentId={assessmentId}
          isRandomized={form.is_randomized}
          existingMappings={existingMappings}
          initialStaged={stagedQuestions}
          onConfirm={(staged) => {
            setStagedQuestions(staged);
            setPickerOpen(false);
          }}
        />
      )}

      {/* ── Mode switch confirmation dialog ── */}
      <ConfirmationDialog
        open={modeConfirmOpen}
        onClose={() => { setModeConfirmOpen(false); setPendingMode(null); }}
        onConfirm={handleModeConfirm}
        title="Change Question Selection Mode?"
        description={`Switching to "${MODE_OPTIONS.find(o => o.value === pendingMode)?.label ?? pendingMode}" will permanently remove all ${existingMappings.length + stagedQuestions.length} question(s) currently mapped to this assessment. This cannot be undone.`}
        confirmLabel="Change Mode"
        variant="danger"
      />
    </div>
  );
}
