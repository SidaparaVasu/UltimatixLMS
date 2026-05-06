import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Clock, Loader2, RotateCcw, FileText, AlertCircle,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  useReviewDetail,
  useSubmitGrades,
  useGrantRetake,
} from '@/queries/admin/useAssessmentReviewQueries';
import { ReviewAnswer, ManualGradeItem } from '@/types/assessment-review.types';
import { useNotificationStore } from '@/stores/notificationStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  MCQ:         'Single Choice',
  MSQ:         'Multiple Select',
  TRUE_FALSE:  'True / False',
  DESCRIPTIVE: 'Descriptive',
  SCENARIO:    'Scenario',
  FILE_UPLOAD: 'File Upload',
};

// ── Auto-graded answer card (read-only, collapsible) ─────────────────────────

const AutoGradedCard: React.FC<{ answer: ReviewAnswer; index: number }> = ({ answer, index }) => {
  const [open, setOpen] = useState(false);
  const correct = Number(answer.earned_points) > 0;

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      opacity: 0.85,
    }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {correct
          ? <CheckCircle2 size={16} style={{ color: '#15803d', flexShrink: 0 }} />
          : <XCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
        }
        <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          Q{index + 1} · {QUESTION_TYPE_LABEL[answer.question_type] ?? answer.question_type}
          <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            — {answer.question_text.slice(0, 80)}{answer.question_text.length > 80 ? '…' : ''}
          </span>
        </span>
        <span style={{
          fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)',
          color: correct ? '#15803d' : '#dc2626',
          marginRight: 'var(--space-2)',
        }}>
          {Number(answer.earned_points)} / {Number(answer.max_points)} pts
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
               : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
      </button>

      {/* Expanded detail */}
      {open && (
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          {answer.scenario_text && (
            <div style={{
              padding: 'var(--space-3)', marginBottom: 'var(--space-3)',
              background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)',
              fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6,
              borderLeft: '3px solid var(--color-accent)',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Scenario</span>
              {answer.scenario_text}
            </div>
          )}

          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
            {answer.question_text}
          </p>

          {/* Options */}
          {answer.selected_options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {answer.correct_options.map(opt => {
                const selected = answer.selected_options.some(s => s.id === opt.id);
                return (
                  <div key={opt.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.25)',
                    fontSize: '13px', color: '#15803d',
                  }}>
                    <CheckCircle2 size={13} />
                    {opt.option_text}
                    {selected && <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600 }}>Your answer</span>}
                  </div>
                );
              })}
              {answer.selected_options
                .filter(s => !answer.correct_options.some(c => c.id === s.id))
                .map(opt => (
                  <div key={opt.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                    fontSize: '13px', color: '#dc2626',
                  }}>
                    <XCircle size={13} />
                    {opt.option_text}
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600 }}>Your answer (incorrect)</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Pending answer card (editable score) ─────────────────────────────────────

interface PendingCardProps {
  answer: ReviewAnswer;
  index: number;
  score: string;
  onScoreChange: (val: string) => void;
}

const PendingCard: React.FC<PendingCardProps> = ({ answer, index, score, onScoreChange }) => {
  const scoreNum = parseFloat(score);
  const maxPts = Number(answer.max_points);
  const valid = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= maxPts;

  return (
    <div style={{
      border: '1px solid var(--color-accent)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <AlertCircle size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent)' }}>
          Q{index + 1} · {QUESTION_TYPE_LABEL[answer.question_type] ?? answer.question_type}
          <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            Pending Review
          </span>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Max: {answer.max_points} pts
        </span>
      </div>

      <div style={{ padding: 'var(--space-4)' }}>
        {/* Scenario */}
        {answer.scenario_text && (
          <div style={{
            padding: 'var(--space-3)', marginBottom: 'var(--space-3)',
            background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)',
            fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6,
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Scenario</span>
            {answer.scenario_text}
          </div>
        )}

        {/* Question */}
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
          {answer.question_text}
        </p>

        {/* Learner's answer */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
            Learner's Answer
          </p>
          {answer.answer_text ? (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', fontSize: '13px',
              color: 'var(--color-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap',
            }}>
              {answer.answer_text}
            </div>
          ) : answer.uploaded_file ? (
            <a
              href={`/api/v1/files/files/${answer.uploaded_file}/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                fontSize: '13px', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500,
              }}
            >
              <FileText size={14} />
              View Uploaded File
            </a>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No answer provided.
            </p>
          )}
        </div>

        {/* Score input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
            Award Points
          </label>
          <input
            type="number"
            min={0}
            max={maxPts}
            step={0.5}
            value={score}
            onChange={e => onScoreChange(e.target.value)}
            className="form-input"
            style={{
              width: '90px', textAlign: 'center', fontFamily: 'var(--font-mono)',
              borderColor: valid ? 'var(--color-border)' : 'var(--color-danger)',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            / {maxPts} pts
          </span>
          {!valid && score !== '' && (
            <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
              Must be 0 – {maxPts}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentReviewDetailPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const showNotification = useNotificationStore(s => s.showNotification);

  const { data: attempt, isLoading, error } = useReviewDetail(attemptId);
  const submitGrades = useSubmitGrades(attemptId);
  const grantRetake  = useGrantRetake(attemptId);

  // Local score state: answerId → string (so empty input is allowed)
  const [scores, setScores] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState('');
  const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
  const [retakeNote, setRetakeNote] = useState('');

  // Split answers into pending (manual) and auto-graded
  const pendingAnswers = useMemo(
    () => attempt?.answers.filter(a => !a.is_auto_graded && a.status === 'ATTEMPTED') ?? [],
    [attempt]
  );
  const autoAnswers = useMemo(
    () => attempt?.answers.filter(a => a.is_auto_graded) ?? [],
    [attempt]
  );

  // Initialise score inputs when data loads
  React.useEffect(() => {
    if (!attempt) return;
    const init: Record<number, string> = {};
    attempt.answers.forEach(a => {
      if (!a.is_auto_graded) init[a.id] = '';
    });
    setScores(init);
  }, [attempt?.id]);

  // Derived: auto-score already earned
  const autoScore = useMemo(
    () => autoAnswers.reduce((sum, a) => sum + Number(a.earned_points), 0),
    [autoAnswers]
  );
  const totalPoints = useMemo(
    () => attempt?.answers.reduce((sum, a) => sum + Number(a.max_points), 0) ?? 0,
    [attempt]
  );

  // Validation: all pending answers must have a valid score
  const allScoresValid = useMemo(() => {
    return pendingAnswers.every(a => {
      const v = parseFloat(scores[a.id] ?? '');
      return !isNaN(v) && v >= 0 && v <= a.max_points;
    });
  }, [pendingAnswers, scores]);

  const handleSubmit = () => {
    if (!allScoresValid) return;
    const grades: ManualGradeItem[] = pendingAnswers.map(a => ({
      answer_id: a.id,
      earned_points: parseFloat(scores[a.id]),
    }));
    submitGrades.mutate(
      { grades, instructor_feedback: feedback.trim() },
      {
        onSuccess: (result) => {
          showNotification(
            `Grading submitted — Result: ${result?.status} (${result?.score_percentage?.toFixed(1)}%)`,
            'success',
          );
          navigate('/admin/assessments/review');
        },
        onError: () => {
          showNotification('Submission failed. Please try again.', 'error');
        },
      }
    );
  };

  const handleGrantRetake = () => {
    grantRetake.mutate(
      { note: retakeNote.trim() },
      {
        onSuccess: () => {
          showNotification('Retake granted. The learner can now start a new attempt.', 'success');
          setShowRetakeConfirm(false);
          setRetakeNote('');
        },
        onError: () => {
          showNotification('Failed to grant retake. Please try again.', 'error');
        },
      }
    );
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="content-inner" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-16)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="content-inner">
        <p style={{ color: 'var(--color-danger)', fontSize: '14px' }}>Failed to load attempt. Please go back and try again.</p>
      </div>
    );
  }

  const alreadyGraded = attempt.result?.grading_type === 'MANUALLY_GRADED';

  return (
    <div className="content-inner" style={{paddingBottom: "50px"}}>

      {/* Page header */}
      <AdminPageHeader
        title="Review Submission"
        description={`${attempt.learner_name} · ${attempt.employee_code}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Assessments' },
          { label: 'Review Queue', href: '/admin/assessments/review' },
          { label: attempt.assessment_title },
        ]}
        action={
          <button
            onClick={() => setShowRetakeConfirm(true)}
            disabled={grantRetake.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            Grant Retake
          </button>
        }
      />

      {/* Summary bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)',
      }}>
        {[
          { label: 'Learner',     value: attempt.learner_name },
          { label: 'Assessment',  value: attempt.assessment_title },
          { label: 'Submitted',   value: attempt.submitted_at ? formatDate(attempt.submitted_at) : '—' },
          { label: 'Auto Score',  value: `${autoScore.toFixed(1)} / ${totalPoints.toFixed(1)} pts` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{label}</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Already graded banner */}
      {alreadyGraded && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-5)',
          background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.25)',
          borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#15803d', fontWeight: 500,
        }}>
          <CheckCircle2 size={16} />
          This submission has already been graded.
          Result: <strong>{attempt.result?.status}</strong> — {attempt.result?.score_percentage}%
        </div>
      )}

      {/* Pending questions */}
      {pendingAnswers.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            Questions Requiring Review
            <span style={{
              marginLeft: '8px', fontSize: '11px', fontWeight: 600,
              padding: '2px 8px', borderRadius: '999px',
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
            }}>
              {pendingAnswers.length}
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {pendingAnswers.map((answer, i) => (
              <PendingCard
                key={answer.id}
                answer={answer}
                index={i}
                score={scores[answer.id] ?? ''}
                onScoreChange={val => setScores(prev => ({ ...prev, [answer.id]: val }))}
              />
            ))}
          </div>
        </section>
      )}

      {/* Auto-graded questions (collapsible) */}
      {autoAnswers.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-3)' }}>
            Auto-Graded Questions
            <span style={{
              marginLeft: '8px', fontSize: '11px', fontWeight: 600,
              padding: '2px 8px', borderRadius: '999px',
              background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)',
            }}>
              {autoAnswers.length} · read-only
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {autoAnswers.map((answer, i) => (
              <AutoGradedCard key={answer.id} answer={answer} index={pendingAnswers.length + i} />
            ))}
          </div>
        </section>
      )}

      {/* Instructor feedback + submit */}
      {!alreadyGraded && pendingAnswers.length > 0 && (
        <div style={{
          padding: 'var(--space-5)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">
              Instructor Feedback
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px' }}>(optional — shown to learner)</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Add overall feedback for the learner…"
              style={{ resize: 'vertical', minHeight: '72px', padding: '10px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
              Passing threshold: <strong>{attempt.passing_percentage}%</strong>
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => navigate('/admin/assessments/review')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allScoresValid || submitGrades.isPending}
                style={{
                  padding: '9px 22px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--color-accent)', color: '#fff',
                  fontSize: '13px', fontWeight: 600,
                  cursor: !allScoresValid ? 'not-allowed' : 'pointer',
                  opacity: !allScoresValid ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {submitGrades.isPending && <Loader2 size={14} className="animate-spin" />}
                Submit Grades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Retake confirmation dialog */}
      <ConfirmationDialog
        open={showRetakeConfirm}
        onClose={() => { setShowRetakeConfirm(false); setRetakeNote(''); }}
        onConfirm={handleGrantRetake}
        title="Grant Retake"
        description={`This will allow ${attempt.learner_name} to start one additional attempt on "${attempt.assessment_title}". The learner will be able to retake the assessment immediately.`}
        confirmLabel="Grant Retake"
        variant="primary"
        isLoading={grantRetake.isPending}
      />
    </div>
  );
}
