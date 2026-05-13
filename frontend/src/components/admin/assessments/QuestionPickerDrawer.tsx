import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, GripVertical, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Sparkles, Loader2, Trash2,
  CheckCircle, CheckSquare,
} from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { AdminSelect } from '@/components/admin/form';
import { DialogFooterActions } from '@/components/admin/form';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { AdminPagination } from '@/components/ui/pagination';
import { useQuestionBankList, useCreateQuestion } from '@/queries/admin/useQuestionBankQueries';
import { useSkills, useSkillLevels } from '@/queries/admin/useAdminMasters';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  QuestionBankItem,
  QuestionOption,
  StandaloneQuestionType,
  CreateQuestionPayload,
  CreateQuestionOptionPayload,
} from '@/types/question-bank.types';
import { QuestionMappingItem, StagedQuestion } from '@/types/standalone-assessment.types';

// ── Re-export StagedQuestion so consumers can import from this file ───────────
export type { StagedQuestion };

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuestionPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Assessment ID — used to exclude already-mapped questions from the browser.
   * Pass null for new (unsaved) assessments — the exclude filter is simply skipped.
   */
  assessmentId: number | null;
  /** Whether the assessment has is_randomized=true (hides drag handles) */
  isRandomized: boolean;
  /** Questions already confirmed/saved on the assessment */
  existingMappings: QuestionMappingItem[];
  /** Called when admin confirms the staged selection */
  onConfirm: (staged: StagedQuestion[]) => void;
  /** Pre-populated staged list (e.g. from auto-suggest) */
  initialStaged?: StagedQuestion[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: 'MCQ', MSQ: 'Multi-Select', TRUE_FALSE: 'True/False',
  DESCRIPTIVE: 'Descriptive', SCENARIO: 'Scenario',
};

const QUESTION_TYPE_COLORS: Record<string, string> = {
  MCQ: 'var(--color-accent)', MSQ: '#8b5cf6', TRUE_FALSE: '#10b981',
  DESCRIPTIVE: '#f59e0b', SCENARIO: '#06b6d4',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy', 2: 'Basic', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert',
};

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'MCQ', label: 'MCQ' },
  { value: 'MSQ', label: 'Multi-Select' },
  { value: 'TRUE_FALSE', label: 'True/False' },
  { value: 'DESCRIPTIVE', label: 'Descriptive' },
  { value: 'SCENARIO', label: 'Scenario' },
];

const CREATE_TYPE_OPTIONS = [
  { value: 'MCQ',         label: 'Single Choice (MCQ)' },
  { value: 'MSQ',         label: 'Multiple Select (MSQ)' },
  { value: 'TRUE_FALSE',  label: 'True / False' },
  { value: 'DESCRIPTIVE', label: 'Descriptive / Long Answer' },
  { value: 'SCENARIO',    label: 'Scenario-based' },
];

const DIFFICULTY_OPTIONS = [
  { value: '1', label: '1 — Easy' },
  { value: '2', label: '2 — Basic' },
  { value: '3', label: '3 — Intermediate' },
  { value: '4', label: '4 — Advanced' },
  { value: '5', label: '5 — Expert' },
];

const BANK_PAGE_SIZE = 15;

const genId = () => Math.random().toString(36).slice(2, 9);

// ── Shared sub-components ─────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const color = QUESTION_TYPE_COLORS[type] ?? 'var(--color-accent)';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0,
      background: `color-mix(in srgb, ${color} 12%, transparent)`,
      color,
    }}>
      {QUESTION_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── BankQuestionRow — expandable row in the left browser panel ────────────────

interface BankQuestionRowProps {
  item: QuestionBankItem;
  isAlreadySaved: boolean;  // already in existingMappings (saved to DB)
  isStaged: boolean;        // in the current staged list (not yet saved)
  onAdd: (item: QuestionBankItem) => void;
}

const BankQuestionRow: React.FC<BankQuestionRowProps> = ({
  item, isAlreadySaved, isStaged, onAdd,
}) => {
  const [expanded, setExpanded] = useState(false);
  const typeColor = QUESTION_TYPE_COLORS[item.question_type] ?? 'var(--color-accent)';
  const isAdded = isAlreadySaved || isStaged;

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      opacity: isAlreadySaved ? 0.55 : 1,
      transition: 'box-shadow 150ms',
    }}>
      {/* ── Collapsed header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            flexShrink: 0, background: 'none', border: 'none',
            cursor: 'pointer', padding: '2px',
            color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center',
          }}
        >
          {expanded
            ? <ChevronUp size={13} />
            : <ChevronDown size={13} />
          }
        </button>

        <TypeBadge type={item.question_type} />

        {/* Question text preview */}
        <span style={{
          flex: 1, fontSize: '12px', fontWeight: 500,
          color: 'var(--color-text-primary)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.question_text}
        </span>

        {/* Skill tag */}
        {item.skill_name && (
          <span style={{
            flexShrink: 0, fontSize: '10px', fontWeight: 500,
            color: 'var(--color-text-muted)',
            padding: '1px 7px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            whiteSpace: 'nowrap',
          }}>
            {item.skill_name}
            {item.skill_level_name && ` · ${item.skill_level_name}`}
          </span>
        )}

        {/* Difficulty */}
        <span style={{
          flexShrink: 0, fontSize: '10px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          L{item.difficulty_complexity}
        </span>

        {/* Add button */}
        <button
          onClick={() => !isAdded && onAdd(item)}
          disabled={isAdded}
          title={
            isAlreadySaved ? 'Already mapped to this assessment'
            : isStaged ? 'Already in your selection'
            : 'Add to selection'
          }
          style={{
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontSize: '11px', fontWeight: 600,
            background: isAdded
              ? 'rgba(22,163,74,0.10)'
              : 'var(--color-accent)',
            color: isAdded ? '#15803d' : '#fff',
            cursor: isAdded ? 'default' : 'pointer',
            transition: 'all 150ms',
            whiteSpace: 'nowrap',
          }}
        >
          {isAdded ? '✓ Added' : '+ Add'}
        </button>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          padding: 'var(--space-3) var(--space-4)',
        }}>
          {item.scenario_text && (
            <div style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-surface)',
              borderLeft: `3px solid ${typeColor}`,
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              marginBottom: 'var(--space-3)',
            }}>
              <p style={{ margin: '0 0 3px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Scenario
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {item.scenario_text}
              </p>
            </div>
          )}

          <p style={{ margin: '0 0 var(--space-3)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            {item.question_text}
          </p>

          {item.options && item.options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
              {item.options.map((opt: QuestionOption, i: number) => (
                <div key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${opt.is_correct ? 'rgba(22,163,74,0.3)' : 'var(--color-border)'}`,
                  background: opt.is_correct ? 'rgba(22,163,74,0.06)' : 'var(--color-surface)',
                }}>
                  {opt.is_correct
                    ? <CheckCircle2 size={12} style={{ flexShrink: 0, color: '#16a34a' }} />
                    : <XCircle size={12} style={{ flexShrink: 0, color: 'var(--color-border)' }} />
                  }
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: '12px', color: opt.is_correct ? '#15803d' : 'var(--color-text-secondary)' }}>
                    {opt.option_text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {item.explanation_text && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Explanation: {item.explanation_text}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── StagedQuestionRow — row in the right selection panel ─────────────────────

interface StagedQuestionRowProps {
  item: StagedQuestion;
  index: number;
  showDragHandle: boolean;
  onRemove: (questionId: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
}

const StagedQuestionRow: React.FC<StagedQuestionRowProps> = ({
  item, index, showDragHandle, onRemove, onDragStart, onDragOver, onDrop,
}) => {

  return (
    <div
      draggable={showDragHandle}
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={onDrop}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface)',
        cursor: showDragHandle ? 'grab' : 'default',
        transition: 'box-shadow 150ms',
      }}
    >
      {/* Order number */}
      <span style={{
        flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
        background: 'var(--color-surface-alt)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)',
      }}>
        {index + 1}
      </span>

      {/* Drag handle — only when order matters */}
      {showDragHandle && (
        <GripVertical size={14} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
      )}

      {/* Type badge */}
      <TypeBadge type={item.question_type} />

      {/* Question text */}
      <span style={{
        flex: 1, fontSize: '12px', fontWeight: 500,
        color: 'var(--color-text-primary)', lineHeight: 1.4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.question_text}
      </span>

      {/* Skill tag */}
      {item.skill_name && (
        <span style={{
          flexShrink: 0, fontSize: '10px', color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
        }}>
          {item.skill_name}
          {item.skill_level_name && ` · ${item.skill_level_name}`}
        </span>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(item.questionId)}
        title="Remove from selection"
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          cursor: 'pointer', padding: '3px',
          color: 'var(--color-text-muted)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center',
          transition: 'color 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ── InlineCreateForm — embedded question creation ─────────────────────────────

interface InlineCreateFormProps {
  skills: Array<{ value: string; label: string }>;
  skillLevels: Array<{ value: string; label: string }>;
  onCreated: (item: QuestionBankItem) => void;
  onCancel: () => void;
}

interface OptionRow {
  id: string;
  option_text: string;
  is_correct: boolean;
}

const DEFAULT_MCQ_OPTIONS = (): OptionRow[] => [
  { id: genId(), option_text: '', is_correct: false },
  { id: genId(), option_text: '', is_correct: false },
  { id: genId(), option_text: '', is_correct: false },
  { id: genId(), option_text: '', is_correct: false },
];

const TRUE_FALSE_OPTIONS = (): OptionRow[] => [
  { id: genId(), option_text: 'True',  is_correct: true  },
  { id: genId(), option_text: 'False', is_correct: false },
];

const InlineCreateForm: React.FC<InlineCreateFormProps> = ({
  skills, skillLevels, onCreated, onCancel,
}) => {
  const createQuestion = useCreateQuestion();
  const showNotification = useNotificationStore(s => s.showNotification);

  const [questionType, setQuestionType] = useState<StandaloneQuestionType>('MCQ');
  const [questionText, setQuestionText] = useState('');
  const [scenarioText, setScenarioText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [difficulty, setDifficulty] = useState('2');
  const [skillId, setSkillId] = useState('');
  const [skillLevelId, setSkillLevelId] = useState('');
  const [options, setOptions] = useState<OptionRow[]>(DEFAULT_MCQ_OPTIONS());

  // Reset options when type changes
  useEffect(() => {
    if (questionType === 'TRUE_FALSE') {
      setOptions(TRUE_FALSE_OPTIONS());
    } else if (questionType === 'MCQ' || questionType === 'MSQ') {
      setOptions(DEFAULT_MCQ_OPTIONS());
    } else {
      setOptions([]);
    }
  }, [questionType]);

  const isMulti   = questionType === 'MSQ';
  const isFixed   = questionType === 'TRUE_FALSE';
  const hasOpts   = ['MCQ', 'MSQ', 'TRUE_FALSE', 'SCENARIO'].includes(questionType);
  const hasScen   = questionType === 'SCENARIO';
  const hasText   = questionType === 'DESCRIPTIVE';

  const handleOptionText = (id: string, text: string) =>
    setOptions(prev => prev.map(o => o.id === id ? { ...o, option_text: text } : o));

  const handleCorrectToggle = (id: string) => {
    if (isMulti) {
      setOptions(prev => prev.map(o => o.id === id ? { ...o, is_correct: !o.is_correct } : o));
    } else {
      setOptions(prev => prev.map(o => ({ ...o, is_correct: o.id === id })));
    }
  };

  const isValid = (() => {
    if (!questionText.trim() || !skillId || !skillLevelId) return false;
    if (questionType === 'MCQ' || questionType === 'TRUE_FALSE') {
      if (options.length < 2 || !options.some(o => o.is_correct)) return false;
      if (options.some(o => !o.option_text.trim())) return false;
    }
    if (questionType === 'MSQ') {
      if (options.length < 2 || options.filter(o => o.is_correct).length < 2) return false;
      if (options.some(o => !o.option_text.trim())) return false;
    }
    if (questionType === 'SCENARIO') {
      if (!scenarioText.trim()) return false;
      if (options.length > 0 && (!options.some(o => o.is_correct) || options.some(o => !o.option_text.trim()))) return false;
    }
    return true;
  })();

  const handleSave = () => {
    if (!isValid) return;
    const payload: CreateQuestionPayload = {
      question_text:        questionText.trim(),
      question_type:        questionType,
      scenario_text:        scenarioText.trim() || undefined,
      explanation_text:     explanationText.trim() || undefined,
      difficulty_complexity: parseInt(difficulty, 10),
      skill:       skillId      ? parseInt(skillId, 10)      : null,
      skill_level: skillLevelId ? parseInt(skillLevelId, 10) : null,
    };
    if (hasOpts && options.length > 0) {
      payload.options = options.map((o, i): CreateQuestionOptionPayload => ({
        option_text:   o.option_text.trim(),
        is_correct:    o.is_correct,
        display_order: i + 1,
      }));
    }
    createQuestion.mutate(payload, {
      onSuccess: (created) => {
        if (created) {
          showNotification('Question created and added to selection.', 'success');
          onCreated(created as QuestionBankItem);
        }
      },
      onError: () => showNotification('Failed to create question.', 'error'),
    });
  };

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Create New Question
        </span>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Form body */}
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column' }}>
        <AdminSelect
          label="Question Type"
          required
          value={questionType}
          onChange={v => setQuestionType(v as StandaloneQuestionType)}
          options={CREATE_TYPE_OPTIONS}
        />

        {hasScen && (
          <div className="form-group">
            <label className="form-label">Scenario / Context <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input" rows={3} value={scenarioText}
              onChange={e => setScenarioText(e.target.value)}
              placeholder="Provide the scenario..." style={{ resize: 'vertical', minHeight: '64px' }} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Question Text <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <textarea className="form-input" rows={3} value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            placeholder="Enter the question..." style={{ resize: 'vertical', minHeight: '64px', padding: '5px 10px' }} />
        </div>

        {hasOpts && (
          <div className="form-group">
            <label className="form-label">
              Answer Options
              {isMulti && <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>(select all correct)</span>}
              {!isMulti && !isFixed && <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>(select one correct)</span>}
            </label>
            {options.map((opt, idx) => (
              <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <button type="button" onClick={() => handleCorrectToggle(opt.id)}
                  style={{
                    flexShrink: 0, width: '20px', height: '20px',
                    borderRadius: isMulti ? '4px' : '50%',
                    border: `2px solid ${opt.is_correct ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: opt.is_correct ? 'var(--color-accent)' : 'transparent',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}>
                  {opt.is_correct && (isMulti ? <CheckSquare size={11} /> : <CheckCircle size={11} />)}
                </button>
                <input type="text" className="form-input" value={opt.option_text} disabled={isFixed}
                  onChange={e => handleOptionText(opt.id, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  style={{ flex: 1, fontSize: '13px' }} />
                {options.length > 2 && !isFixed && (
                  <button type="button" onClick={() => setOptions(prev => prev.filter(o => o.id !== opt.id))}
                    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '3px' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {!isFixed && (
              <button type="button" onClick={() => setOptions(prev => [...prev, { id: genId(), option_text: '', is_correct: false }])}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px', fontWeight: 600, padding: '4px 0' }}>
                <Plus size={12} /> Add Option
              </button>
            )}
          </div>
        )}

        {hasText && (
          <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Learners will type their answer. This question requires manual grading.
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Explanation <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '4px' }}>(optional)</span></label>
          <textarea className="form-input" rows={2} value={explanationText}
            onChange={e => setExplanationText(e.target.value)}
            placeholder="Explain the correct answer..." style={{ resize: 'vertical', minHeight: '48px', padding: '5px 10px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Skill <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <Combobox options={skills as ComboboxOption[]} value={skillId ? [skillId] : []}
              onChange={vals => { setSkillId(vals[0] ?? ''); setSkillLevelId(''); }}
              placeholder="Search skill..." maxItems={1} />
          </div>
          <div className="form-group">
            <label className="form-label">Skill Level <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <Combobox options={skillLevels as ComboboxOption[]} value={skillLevelId ? [skillLevelId] : []}
              onChange={vals => setSkillLevelId(vals[0] ?? '')}
              placeholder="Search level..." maxItems={1} />
          </div>
        </div>

        <AdminSelect label="Difficulty Level" value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} />

        {/* Form actions */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
          <button type="button" onClick={onCancel}
            style={{ padding: '7px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!isValid || createQuestion.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none',
              background: isValid ? 'var(--color-accent)' : 'var(--color-border)',
              color: isValid ? '#fff' : 'var(--color-text-muted)',
              fontSize: '13px', fontWeight: 600,
              cursor: isValid && !createQuestion.isPending ? 'pointer' : 'not-allowed',
            }}>
            {createQuestion.isPending && <Loader2 size={13} className="animate-spin" />}
            Create & Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main QuestionPickerDrawer ─────────────────────────────────────────────────

export const QuestionPickerDrawer: React.FC<QuestionPickerDrawerProps> = ({
  open,
  onClose,
  assessmentId,
  isRandomized,
  existingMappings,
  onConfirm,
  initialStaged = [],
}) => {
  // ── Browser panel state ───────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage]             = useState(1);

  // ── Staged selection state ────────────────────────────────────────────────
  const [staged, setStaged] = useState<StagedQuestion[]>([]);

  // ── Inline create form visibility ─────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Skills / levels for the inline create form ────────────────────────────
  const { data: skillsRes }  = useSkills();
  const { data: levelsRes }  = useSkillLevels();
  const skills      = (skillsRes?.results  ?? []).map((s: any) => ({ value: String(s.id), label: s.skill_name }));
  const skillLevels = (levelsRes?.results  ?? []).map((l: any) => ({ value: String(l.id), label: l.level_name }));

  // ── Question bank query ───────────────────────────────────────────────────
  const { data: bankData, isLoading: bankLoading } = useQuestionBankList({
    search:             search || undefined,
    question_type:      (typeFilter as StandaloneQuestionType) || undefined,
    is_active:          true,
    // Only exclude already-mapped questions when we have a saved assessment ID
    exclude_assessment: assessmentId ?? undefined,
    page,
    page_size:          BANK_PAGE_SIZE,
  });

  const bankItems = bankData?.results ?? [];
  const bankTotal = bankData?.count   ?? 0;

  // ── Derived sets for fast lookup ──────────────────────────────────────────
  const savedIds  = new Set(existingMappings.map(m => m.question));
  const stagedIds = new Set(staged.map(s => s.questionId));

  // ── Initialise staged list when drawer opens ──────────────────────────────
  useEffect(() => {
    if (open) {
      setStaged(initialStaged.length > 0 ? [...initialStaged] : []);
      setSearch('');
      setTypeFilter('');
      setPage(1);
      setShowCreateForm(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset page when filters change ────────────────────────────────────────
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  // ── Add a bank question to staged ────────────────────────────────────────
  const handleAdd = useCallback((item: QuestionBankItem) => {
    setStaged(prev => [
      ...prev,
      {
        questionId:           item.id,
        question_text:        item.question_text,
        question_type:        item.question_type,
        skill_name:           item.skill_name,
        skill_level_name:     item.skill_level_name,
        difficulty_complexity: item.difficulty_complexity,
        display_order:        prev.length + 1,
      },
    ]);
  }, []);

  // ── Remove from staged ────────────────────────────────────────────────────
  const handleRemove = useCallback((questionId: string) => {
    setStaged(prev => {
      const next = prev.filter(s => s.questionId !== questionId);
      return next.map((s, i) => ({ ...s, display_order: i + 1 }));
    });
  }, []);

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  const handleDrop = useCallback(() => {
    if (dragFromIndex === null || dragOverIndex === null || dragFromIndex === dragOverIndex) {
      setDragFromIndex(null);
      setDragOverIndex(null);
      return;
    }
    setStaged(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragFromIndex, 1);
      next.splice(dragOverIndex, 0, moved);
      return next.map((s, i) => ({ ...s, display_order: i + 1 }));
    });
    setDragFromIndex(null);
    setDragOverIndex(null);
  }, [dragFromIndex, dragOverIndex]);

  // ── Inline create: question created → add to staged ──────────────────────
  const handleCreated = useCallback((item: QuestionBankItem) => {
    setShowCreateForm(false);
    handleAdd(item);
  }, [handleAdd]);

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    onConfirm(staged);
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Drawer
      open={open}
      onOpenChange={onClose}
      position="right"
      size="100vw"
      title="Select Questions"
      description="Browse the question bank and build your assessment question list."
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {staged.length} question{staged.length !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={staged.length === 0}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-md)',
                border: 'none',
                background: staged.length > 0 ? 'var(--color-accent)' : 'var(--color-border)',
                color: staged.length > 0 ? '#fff' : 'var(--color-text-muted)',
                fontSize: '13px', fontWeight: 600,
                cursor: staged.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Confirm Selection
            </button>
          </div>
        </div>
      }
    >
      {/* ── Two-column layout — fills the drawer body height ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-4)',
        // Explicit height so grid children can scroll independently
        height: 'auto',
      }}>

        {/* ── LEFT: Question bank browser ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', overflow: 'hidden' }}>

          {/* Search + type filter */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{
                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search questions..."
                style={{ paddingLeft: '32px', fontSize: '13px', width: '100%' }}
              />
            </div>
            <select
              className="form-input"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ width: '140px', cursor: 'pointer', flexShrink: 0, fontSize: '13px' }}
            >
              {TYPE_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Question list — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: 0 }}>
            {bankLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  height: '44px', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-alt)',
                }} className="skeleton" />
              ))
            )}

            {!bankLoading && bankItems.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--space-12) var(--space-6)',
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
                color: 'var(--color-text-muted)',
              }}>
                <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>No questions found</p>
                <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                  {search ? 'Try a different search term.' : 'All available questions are already mapped.'}
                </p>
              </div>
            )}

            {!bankLoading && bankItems.map(item => (
              <BankQuestionRow
                key={item.id}
                item={item}
                isAlreadySaved={savedIds.has(item.id)}
                isStaged={stagedIds.has(item.id)}
                onAdd={handleAdd}
              />
            ))}
          </div>

          {/* Pagination */}
          {bankTotal > BANK_PAGE_SIZE && (
            <div style={{ flexShrink: 0 }}>
              <AdminPagination
                currentPage={page}
                totalPages={Math.ceil(bankTotal / BANK_PAGE_SIZE)}
                totalItems={bankTotal}
                pageSize={BANK_PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}

          {/* Create question section */}
          <div style={{ flexShrink: 0 }}>
            {!showCreateForm ? (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
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
                  Create New Question
                </button>

                {/* AI Generate — disabled, coming soon */}
                <button
                  disabled
                  title="AI-powered question generation — coming soon"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)',
                    color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 500,
                    cursor: 'not-allowed', opacity: 0.7,
                  }}
                >
                  <Sparkles size={14} />
                  AI Generate
                </button>
              </div>
            ) : (
              <InlineCreateForm
                skills={skills}
                skillLevels={skillLevels}
                onCreated={handleCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: Staged selection ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
          borderLeft: '1px solid var(--color-border)',
          paddingLeft: 'var(--space-4)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ flexShrink: 0 }}>
            <h3 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Selected Questions
            </h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {staged.length} selected
              {!isRandomized && staged.length > 1 && ' · drag to reorder'}
            </p>
          </div>

          {/* Staged list — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minHeight: 0 }}>
            {staged.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--space-10) var(--space-4)',
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
                color: 'var(--color-text-muted)', textAlign: 'center',
              }}>
                <p style={{ fontSize: '12px', fontWeight: 500, margin: 0 }}>No questions selected</p>
                <p style={{ fontSize: '11px', margin: '4px 0 0' }}>
                  Click "+ Add" on any question to add it here.
                </p>
              </div>
            ) : (
              staged.map((item, index) => (
                <StagedQuestionRow
                  key={item.questionId}
                  item={item}
                  index={index}
                  showDragHandle={!isRandomized}
                  onRemove={handleRemove}
                  onDragStart={setDragFromIndex}
                  onDragOver={setDragOverIndex}
                  onDrop={handleDrop}
                />
              ))
            )}
          </div>

          {/* Clear all */}
          {staged.length > 0 && (
            <button
              onClick={() => setStaged([])}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-danger)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
              }}
            >
              <Trash2 size={12} />
              Clear all
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default QuestionPickerDrawer;
