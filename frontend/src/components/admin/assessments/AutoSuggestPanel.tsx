import React, { useState } from 'react';
import {
  Wand2, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useSuggestQuestions } from '@/queries/admin/useStandaloneAssessmentQueries';
import { QuestionBankItem, QuestionOption } from '@/types/question-bank.types';
import { StagedQuestion } from '@/types/standalone-assessment.types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface AutoSuggestPanelProps {
  /** Assessment ID — required to call the suggest endpoint */
  assessmentId: number;
  /** Whether skill mappings exist (required for suggestion) */
  hasSkillMappings: boolean;
  /** Called when admin accepts the suggestions → converts to staged list */
  onAccept: (staged: StagedQuestion[]) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  MCQ: 'var(--color-accent)', MSQ: '#8b5cf6', TRUE_FALSE: '#10b981',
  DESCRIPTIVE: '#f59e0b', SCENARIO: '#06b6d4',
};

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'MCQ', MSQ: 'Multi-Select', TRUE_FALSE: 'True/False',
  DESCRIPTIVE: 'Descriptive', SCENARIO: 'Scenario',
};

// ── Suggested question preview row ────────────────────────────────────────────

function SuggestedRow({
  item,
  index,
  onRemove,
}: {
  item: QuestionBankItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = TYPE_COLORS[item.question_type] ?? 'var(--color-accent)';

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}>
        {/* Index */}
        <span style={{
          flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%',
          background: 'var(--color-surface-alt)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)',
        }}>
          {index + 1}
        </span>

        {/* Type badge */}
        <span style={{
          flexShrink: 0, padding: '2px 7px', borderRadius: 'var(--radius-full)',
          fontSize: '10px', fontWeight: 700,
          background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
          color: typeColor,
        }}>
          {TYPE_LABELS[item.question_type] ?? item.question_type}
        </span>

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
            padding: '1px 6px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)', background: 'var(--color-bg)',
            whiteSpace: 'nowrap',
          }}>
            {item.skill_name}{item.skill_level_name ? ` · ${item.skill_level_name}` : ''}
          </span>
        )}

        {/* Difficulty */}
        <span style={{ flexShrink: 0, fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          L{item.difficulty_complexity}
        </span>

        {/* Expand */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Remove */}
        <button
          onClick={() => onRemove(item.id)}
          title="Remove from suggestions"
          style={{
            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
            padding: '3px', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <XCircle size={14} />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)', padding: 'var(--space-3) var(--space-4)' }}>
          {item.scenario_text && (
            <div style={{
              padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-3)',
              background: 'var(--color-surface)', borderLeft: `3px solid ${typeColor}`,
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6,
            }}>
              <p style={{ margin: '0 0 3px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Scenario</p>
              {item.scenario_text}
            </div>
          )}
          <p style={{ margin: '0 0 var(--space-3)', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            {item.question_text}
          </p>
          {item.options && item.options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {item.options.map((opt: QuestionOption, i: number) => (
                <div key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${opt.is_correct ? 'rgba(22,163,74,0.3)' : 'var(--color-border)'}`,
                  background: opt.is_correct ? 'rgba(22,163,74,0.06)' : 'var(--color-surface)',
                }}>
                  {opt.is_correct
                    ? <CheckCircle2 size={11} style={{ color: '#16a34a', flexShrink: 0 }} />
                    : <XCircle size={11} style={{ color: 'var(--color-border)', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: '11px', color: opt.is_correct ? '#15803d' : 'var(--color-text-secondary)' }}>
                    {opt.option_text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const AutoSuggestPanel: React.FC<AutoSuggestPanelProps> = ({
  assessmentId,
  hasSkillMappings,
  onAccept,
}) => {
  const suggestMutation = useSuggestQuestions(assessmentId);

  // Local list of suggested questions — admin can remove individual ones before accepting
  const [suggestions, setSuggestions] = useState<QuestionBankItem[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSuggest = () => {
    setApiError(null);
    suggestMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data && Array.isArray(data)) {
          setSuggestions(data as QuestionBankItem[]);
          setHasRun(true);
        }
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.message ??
          err?.response?.data?.error ??
          'Failed to generate suggestions. Check that skill mappings are configured.';
        setApiError(msg);
        setHasRun(true);
      },
    });
  };

  const handleRemove = (questionId: string) => {
    setSuggestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleAccept = () => {
    const staged: StagedQuestion[] = suggestions.map((q, i) => ({
      questionId:            q.id,
      question_text:         q.question_text,
      question_type:         q.question_type,
      skill_name:            q.skill_name,
      skill_level_name:      q.skill_level_name,
      difficulty_complexity: q.difficulty_complexity,
      display_order:         i + 1,
    }));
    onAccept(staged);
  };

  const handleRegenerate = () => {
    setSuggestions([]);
    setHasRun(false);
    setApiError(null);
    handleSuggest();
  };

  // ── Idle state — not yet run ──────────────────────────────────────────────
  if (!hasRun && !suggestMutation.isPending) {
    return (
      <div style={{
        padding: 'var(--space-5)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--space-3)', textAlign: 'center',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wand2 size={20} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div>
          <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Auto Suggestion
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '360px' }}>
            The system will analyse your skill mappings and suggest the best matching questions from the bank.
            You can review and remove any before accepting.
          </p>
        </div>

        {!hasSkillMappings && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: 'var(--space-2) var(--space-3)',
            background: 'rgba(217,119,6,0.06)',
            border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px', color: '#b45309',
          }}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} />
            Add at least one skill mapping before using auto suggestion.
          </div>
        )}

        <button
          onClick={handleSuggest}
          disabled={!hasSkillMappings}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 20px', borderRadius: 'var(--radius-md)',
            border: 'none',
            background: hasSkillMappings ? 'var(--color-accent)' : 'var(--color-border)',
            color: hasSkillMappings ? '#fff' : 'var(--color-text-muted)',
            fontSize: '13px', fontWeight: 600,
            cursor: hasSkillMappings ? 'pointer' : 'not-allowed',
            transition: 'all 150ms',
          }}
        >
          <Wand2 size={15} />
          Generate Suggestions
        </button>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (suggestMutation.isPending) {
    return (
      <div style={{
        padding: 'var(--space-8)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--space-3)', textAlign: 'center',
      }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Analysing skill mappings and selecting questions…
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (apiError) {
    return (
      <div style={{
        padding: 'var(--space-5)',
        border: '1px solid rgba(220,38,38,0.25)',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(220,38,38,0.04)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'var(--space-3)', textAlign: 'center',
      }}>
        <AlertTriangle size={24} style={{ color: '#dc2626' }} />
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>
            Suggestion failed
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '360px' }}>
            {apiError}
          </p>
        </div>
        <button
          onClick={() => { setHasRun(false); setApiError(null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Results state ─────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {/* Results header */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wand2 size={15} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {suggestions.length} question{suggestions.length !== 1 ? 's' : ''} suggested
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            — remove any you don't want, then accept
          </span>
        </div>
        <button
          onClick={handleRegenerate}
          title="Regenerate suggestions"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <RefreshCw size={12} />
          Regenerate
        </button>
      </div>

      {/* Suggestion list */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {suggestions.length === 0 ? (
          <div style={{
            padding: 'var(--space-6)', textAlign: 'center',
            color: 'var(--color-text-muted)', fontSize: '13px',
          }}>
            All suggestions removed. Click Regenerate to start over.
          </div>
        ) : (
          suggestions.map((item, i) => (
            <SuggestedRow
              key={item.id}
              item={item}
              index={i}
              onRemove={handleRemove}
            />
          ))
        )}
      </div>

      {/* Footer actions */}
      {suggestions.length > 0 && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {suggestions.length} question{suggestions.length !== 1 ? 's' : ''} will be added to the assessment
          </span>
          <button
            onClick={handleAccept}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', borderRadius: 'var(--radius-md)',
              border: 'none', background: 'var(--color-accent)', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <CheckCircle2 size={14} />
            Accept Suggestions
          </button>
        </div>
      )}
    </div>
  );
};

export default AutoSuggestPanel;
