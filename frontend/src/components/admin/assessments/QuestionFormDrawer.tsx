import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, CheckSquare } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { AdminSelect } from '@/components/admin/form';
import { DialogFooterActions } from '@/components/admin/form';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { useCreateQuestion } from '@/queries/admin/useQuestionBankQueries';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  StandaloneQuestionType,
  CreateQuestionPayload,
  CreateQuestionOptionPayload,
} from '@/types/question-bank.types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SkillOption {
  value: string;
  label: string;
}

interface SkillLevelOption {
  value: string;
  label: string;
}

interface OptionRow {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface QuestionFormDrawerProps {
  open: boolean;
  onClose: () => void;
  skills: SkillOption[];
  skillLevels: SkillLevelOption[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_OPTIONS = [
  { value: 'MCQ',        label: 'Single Choice (MCQ)' },
  { value: 'MSQ',        label: 'Multiple Select (MSQ)' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'DESCRIPTIVE', label: 'Descriptive / Long Answer' },
  { value: 'SCENARIO',   label: 'Scenario-based' },
];

const DIFFICULTY_OPTIONS = [
  { value: '1', label: '1 — Easy' },
  { value: '2', label: '2 — Basic' },
  { value: '3', label: '3 — Intermediate' },
  { value: '4', label: '4 — Advanced' },
  { value: '5', label: '5 — Expert' },
];

const genId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_MCQ_OPTIONS: OptionRow[] = [
  { id: genId(), option_text: '', is_correct: false },
  { id: genId(), option_text: '', is_correct: false },
  { id: genId(), option_text: '', is_correct: false },
  { id: genId(), option_text: '', is_correct: false },
];

const TRUE_FALSE_OPTIONS: OptionRow[] = [
  { id: genId(), option_text: 'True',  is_correct: true  },
  { id: genId(), option_text: 'False', is_correct: false },
];

// ── Option row component ──────────────────────────────────────────────────────

interface OptionRowProps {
  option: OptionRow;
  index: number;
  isMulti: boolean;
  isFixed: boolean;
  onTextChange: (id: string, text: string) => void;
  onCorrectToggle: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const OptionRowItem: React.FC<OptionRowProps> = ({
  option, index, isMulti, isFixed, onTextChange, onCorrectToggle, onRemove, canRemove,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
    {/* Correct toggle */}
    <button
      type="button"
      onClick={() => onCorrectToggle(option.id)}
      title={option.is_correct ? 'Mark as incorrect' : 'Mark as correct'}
      style={{
        flexShrink: 0,
        width: '22px', height: '22px',
        borderRadius: isMulti ? '4px' : '50%',
        border: `2px solid ${option.is_correct ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: option.is_correct ? 'var(--color-accent)' : 'transparent',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {option.is_correct && (isMulti
        ? <CheckSquare size={12} />
        : <CheckCircle size={12} />
      )}
    </button>

    {/* Option text */}
    <input
      type="text"
      className="form-input"
      value={option.option_text}
      disabled={isFixed}
      onChange={e => onTextChange(option.id, e.target.value)}
      placeholder={`Option ${String.fromCharCode(65 + index)}`}
      style={{ flex: 1, fontSize: '13px' }}
    />

    {/* Remove button */}
    {canRemove && !isFixed && (
      <button
        type="button"
        onClick={() => onRemove(option.id)}
        style={{
          flexShrink: 0, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--color-text-muted)',
          padding: '4px', borderRadius: '4px',
        }}
      >
        <Trash2 size={14} />
      </button>
    )}
  </div>
);

// ── Main drawer ───────────────────────────────────────────────────────────────

export const QuestionFormDrawer: React.FC<QuestionFormDrawerProps> = ({
  open, onClose, skills, skillLevels,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification);
  const createQuestion = useCreateQuestion();

  // Form state
  const [questionType, setQuestionType] = useState<StandaloneQuestionType>('MCQ');
  const [questionText, setQuestionText] = useState('');
  const [scenarioText, setScenarioText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [difficulty, setDifficulty] = useState('2');
  const [skillId, setSkillId] = useState('');
  const [skillLevelId, setSkillLevelId] = useState('');
  const [options, setOptions] = useState<OptionRow[]>(DEFAULT_MCQ_OPTIONS.map(o => ({ ...o, id: genId() })));

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setQuestionType('MCQ');
      setQuestionText('');
      setScenarioText('');
      setExplanationText('');
      setDifficulty('2');
      setSkillId('');
      setSkillLevelId('');
      setOptions(DEFAULT_MCQ_OPTIONS.map(o => ({ ...o, id: genId() })));
    }
  }, [open]);

  // Reset options when question type changes
  useEffect(() => {
    if (questionType === 'TRUE_FALSE') {
      setOptions(TRUE_FALSE_OPTIONS.map(o => ({ ...o, id: genId() })));
    } else if (questionType === 'MCQ' || questionType === 'MSQ') {
      setOptions(DEFAULT_MCQ_OPTIONS.map(o => ({ ...o, id: genId() })));
    } else {
      setOptions([]);
    }
  }, [questionType]);

  const isMultiSelect = questionType === 'MSQ';
  const isFixed = questionType === 'TRUE_FALSE';
  const hasOptions = questionType === 'MCQ' || questionType === 'MSQ' || questionType === 'TRUE_FALSE' || questionType === 'SCENARIO';
  const hasTextAnswer = questionType === 'DESCRIPTIVE';
  const hasScenario = questionType === 'SCENARIO';

  // Option handlers
  const handleOptionText = (id: string, text: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, option_text: text } : o));
  };

  const handleCorrectToggle = (id: string) => {
    if (isMultiSelect) {
      setOptions(prev => prev.map(o => o.id === id ? { ...o, is_correct: !o.is_correct } : o));
    } else {
      // Single select — only one correct at a time
      setOptions(prev => prev.map(o => ({ ...o, is_correct: o.id === id })));
    }
  };

  const handleAddOption = () => {
    setOptions(prev => [...prev, { id: genId(), option_text: '', is_correct: false }]);
  };

  const handleRemoveOption = (id: string) => {
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  // Validation
  const isValid = (() => {
    if (!questionText.trim()) return false;
    if (!skillId) return false;
    if (!skillLevelId) return false;
    if (questionType === 'MCQ' || questionType === 'TRUE_FALSE') {
      if (options.length < 2) return false;
      if (!options.some(o => o.is_correct)) return false;
      if (options.some(o => !o.option_text.trim())) return false;
    }
    if (questionType === 'MSQ') {
      if (options.length < 2) return false;
      if (options.filter(o => o.is_correct).length < 2) return false;
      if (options.some(o => !o.option_text.trim())) return false;
    }
    if (questionType === 'SCENARIO') {
      if (!scenarioText.trim()) return false;
      // Scenario can have options or be descriptive — if options exist, validate them
      if (options.length > 0) {
        if (!options.some(o => o.is_correct)) return false;
        if (options.some(o => !o.option_text.trim())) return false;
      }
    }
    return true;
  })();

  const handleSave = async () => {
    if (!isValid) return;

    const payload: CreateQuestionPayload = {
      question_text: questionText.trim(),
      question_type: questionType,
      scenario_text: scenarioText.trim() || undefined,
      explanation_text: explanationText.trim() || undefined,
      difficulty_complexity: parseInt(difficulty, 10),
      skill: skillId ? parseInt(skillId, 10) : null,
      skill_level: skillLevelId ? parseInt(skillLevelId, 10) : null,
    };

    if (hasOptions && options.length > 0) {
      payload.options = options.map((o, i): CreateQuestionOptionPayload => ({
        option_text: o.option_text.trim(),
        is_correct: o.is_correct,
        display_order: i + 1,
      }));
    }

    createQuestion.mutate(payload, {
      onSuccess: () => {
        showNotification('Question created successfully.', 'success');
        onClose();
      },
      onError: () => {
        showNotification('Failed to create question. Please try again.', 'error');
      },
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onClose}
      position="right"
      size="70vw"
      title="Add Question"
      description="Create a new question for the question bank."
      footer={
        <DialogFooterActions
          onCancel={onClose}
          onSave={handleSave}
          isEditing={false}
          label="Question"
          isSaveDisabled={!isValid}
          isLoading={createQuestion.isPending}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-1) 0' }}>

        {/* Question Type */}
        <AdminSelect
          label="Question Type"
          required
          value={questionType}
          onChange={v => setQuestionType(v as StandaloneQuestionType)}
          options={QUESTION_TYPE_OPTIONS}
        />

        {/* Scenario text (SCENARIO type only) */}
        {hasScenario && (
          <div className="form-group">
            <label className="form-label">
              Scenario / Context <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={scenarioText}
              onChange={e => setScenarioText(e.target.value)}
              placeholder="Provide the scenario or reading passage for this question..."
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>
        )}

        {/* Question text */}
        <div className="form-group">
          <label className="form-label">
            Question Text <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <textarea
            className="form-input"
            rows={3}
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            placeholder="Enter the question..."
            style={{ resize: 'vertical', minHeight: '64px', padding: '5px 10px' }}
          />
        </div>

        {/* Options (MCQ, MSQ, TRUE_FALSE, SCENARIO) */}
        {hasOptions && (
          <div className="form-group">
            <label className="form-label">
              Answer Options
              {isMultiSelect && (
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                  (select all correct answers)
                </span>
              )}
              {!isMultiSelect && !isFixed && (
                <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                  (select one correct answer)
                </span>
              )}
            </label>
            {options.map((opt, idx) => (
              <OptionRowItem
                key={opt.id}
                option={opt}
                index={idx}
                isMulti={isMultiSelect}
                isFixed={isFixed}
                onTextChange={handleOptionText}
                onCorrectToggle={handleCorrectToggle}
                onRemove={handleRemoveOption}
                canRemove={options.length > 2}
              />
            ))}
            {!isFixed && (
              <button
                type="button"
                onClick={handleAddOption}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-accent)', fontSize: '12px', fontWeight: 600,
                  padding: '4px 0', marginTop: 'var(--space-1)',
                }}
              >
                <Plus size={13} /> Add Option
              </button>
            )}
          </div>
        )}

        {/* Descriptive hint */}
        {hasTextAnswer && (
          <div style={{
            padding: 'var(--space-3)',
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            marginBottom: '14px',
          }}>
            Learners will type their answer in a text area. This question requires manual grading.
          </div>
        )}

        {/* Explanation */}
        <div className="form-group">
          <label className="form-label">
            Explanation
            <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>(optional — shown after submission)</span>
          </label>
          <textarea
            className="form-input"
            rows={4}
            value={explanationText}
            onChange={e => setExplanationText(e.target.value)}
            placeholder="Explain the correct answer..."
            style={{ resize: 'vertical', minHeight: '64px', padding: '5px 10px' }}
          />
        </div>

        {/* Skill + Level */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">
              Skill <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <Combobox
              options={skills as ComboboxOption[]}
              value={skillId ? [skillId] : []}
              onChange={vals => { setSkillId(vals[0] ?? ''); setSkillLevelId(''); }}
              placeholder="Search skill..."
              maxItems={1}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Skill Level <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <Combobox
              options={skillLevels as ComboboxOption[]}
              value={skillLevelId ? [skillLevelId] : []}
              onChange={vals => setSkillLevelId(vals[0] ?? '')}
              placeholder="Search level..."
              maxItems={1}
            />
          </div>
        </div>

        {/* Difficulty */}
        <AdminSelect
          label="Difficulty Level"
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTY_OPTIONS}
        />

      </div>
    </Drawer>
  );
};
