import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { TrainingNeed, TNIApprovalStatus } from '@/types/tni.types';
import { SkillGapBadge } from './SkillGapBadge';

interface TrainingNeedApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  trainingNeed: TrainingNeed | null;
  /** Called when the user confirms approve or reject */
  onFinalize: (status: TNIApprovalStatus, comments: string) => void;
  isLoading?: boolean;
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { label: 'High',     color: '#b45309', bg: 'rgba(217,119,6,0.08)' },
  MEDIUM:   { label: 'Medium',   color: '#ca8a04', bg: 'rgba(234,179,8,0.08)' },
  LOW:      { label: 'Low',      color: '#64748b', bg: 'var(--color-surface-alt)' },
};

const sourceConfig: Record<string, string> = {
  SKILL_GAP:  'Auto-detected skill gap',
  SELF:       'Employee self-assessment',
  MANAGER:    'Manager evaluation',
  COMPLIANCE: 'Compliance requirement',
  SYSTEM:     'System generated',
};

/**
 * TrainingNeedApprovalDialog
 *
 * Modal for L&D approvers to review and approve or reject a training need.
 * Shows the employee, skill, priority, source, and gap context.
 * Requires a comment when rejecting.
 */
export const TrainingNeedApprovalDialog: React.FC<TrainingNeedApprovalDialogProps> = ({
  open,
  onClose,
  trainingNeed,
  onFinalize,
  isLoading = false,
}) => {
  const [comments, setComments] = useState('');
  const [pendingAction, setPendingAction] = useState<TNIApprovalStatus | null>(null);

  // Reset state when dialog opens with a new need
  useEffect(() => {
    if (open) {
      setComments('');
      setPendingAction(null);
    }
  }, [open, trainingNeed?.id]);

  if (!trainingNeed) return null;

  const priority = priorityConfig[trainingNeed.priority] ?? priorityConfig.MEDIUM;
  const sourceLabel = sourceConfig[trainingNeed.source_type] ?? trainingNeed.source_type;

  const handleAction = (status: TNIApprovalStatus) => {
    if (status === 'REJECTED' && !comments.trim()) {
      setPendingAction(status); // highlight the comments field
      return;
    }
    onFinalize(status, comments.trim());
  };

  const commentsRequired = pendingAction === 'REJECTED' && !comments.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title="Review Training Need"
      description="Approve or reject this identified training need."
      maxWidth="520px"
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
          }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleAction('REJECTED')}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-danger)',
              background: 'transparent',
              color: 'var(--color-danger)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <XCircle size={14} strokeWidth={2} />
            Reject
          </button>
          <button
            onClick={() => handleAction('APPROVED')}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-success)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            <CheckCircle size={14} strokeWidth={2} />
            {isLoading ? 'Processing…' : 'Approve'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* ── Summary card ─────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
          }}
        >
          <Field label="Employee" value={trainingNeed.employee_name || trainingNeed.employee_code} />
          <Field label="Skill" value={trainingNeed.skill_name} />
          <Field
            label="Priority"
            value={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: priority.color,
                  background: priority.bg,
                }}
              >
                {priority.label}
              </span>
            }
          />
          <Field label="Source" value={sourceLabel} />
        </div>

        {/* ── Notes from system ────────────────────────────────────── */}
        {trainingNeed.notes && (
          <div
            style={{
              padding: 'var(--space-3)',
              background: 'rgba(37,99,235,0.05)',
              border: '1px solid rgba(37,99,235,0.15)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              System note:{' '}
            </span>
            {trainingNeed.notes}
          </div>
        )}

        {/* ── Comments ─────────────────────────────────────────────── */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label
            className="form-label"
            style={{
              color: commentsRequired ? 'var(--color-danger)' : undefined,
            }}
          >
            Comments
            {commentsRequired && (
              <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>
                — required when rejecting
              </span>
            )}
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Add remarks or justification…"
            value={comments}
            onChange={e => {
              setComments(e.target.value);
              if (pendingAction) setPendingAction(null);
            }}
            style={{
              resize: 'vertical',
              borderColor: commentsRequired ? 'var(--color-danger)' : undefined,
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

/* ── Internal helper ─────────────────────────────────────────────────────── */
const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p
      style={{
        margin: '0 0 2px',
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--color-text-muted)',
      }}
    >
      {label}
    </p>
    <div
      style={{
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-primary)',
      }}
    >
      {value}
    </div>
  </div>
);
