import React, { useState, useMemo, useEffect } from 'react';
import { Users, X, Mail, AlertCircle, Loader2, Send } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { CourseParticipant } from '@/types/courses.types';
import { EmployeeDirectoryRow } from '@/types/org.types';

/* ── Avatar initials ─────────────────────────────────────────────────────── */
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
];
const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/* ── Participant row ─────────────────────────────────────────────────────── */
const ParticipantRow: React.FC<{
  name: string;
  email: string;
  code: string;
  employeeId: number;
  onRemove: () => void;
}> = ({ name, email, code, employeeId, onRemove }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 10px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    }}
  >
    {/* Avatar */}
    {/* <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: avatarColor(employeeId),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {initials(name) || '?'}
    </div> */}

    {/* Info */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        {name}
        <div
            style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            }}
        >
            <span
                style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
            ({email})
        </span>
        <Mail size={10} />
      </div>
      </div>
    </div>

    {/* Remove */}
    <button
      onClick={onRemove}
      title="Remove participant"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'color 150ms, background 150ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)';
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <X size={14} />
    </button>
  </div>
);

/* ── Notification confirmation dialog ───────────────────────────────────── */
const NotificationConfirmDialog: React.FC<{
  open: boolean;
  newCount: number;
  onSkip: () => void;
  onSend: () => void;
}> = ({ open, newCount, onSkip, onSend }) => (
  <Dialog
    open={open}
    onOpenChange={onSkip}
    title="Send Invitation Emails?"
    maxWidth="420px"
    footer={
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={onSkip}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
        >
          Skip for now
        </button>
        <div style={{ position: 'relative' }}>
          <button
            disabled
            title="Notification module coming soon"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0.45,
            }}
          >
            <Send size={14} />
            Send Notifications
          </button>
          <span
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              right: 0,
              background: '#1e293b',
              color: '#fff',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              opacity: 0,
              transition: 'opacity 150ms',
            }}
            className="send-tooltip"
          >
            Notification module coming soon
          </span>
        </div>
      </div>
    }
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px',
          background: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.15)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <Send size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>{newCount} participant{newCount !== 1 ? 's' : ''}</strong> have been added to this course.
          Would you like to send them an email invitation?
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          background: 'rgba(217,119,6,0.06)',
          border: '1px solid rgba(217,119,6,0.2)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <AlertCircle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Email notifications will be available once the notification module is set up.
        </span>
      </div>
    </div>
  </Dialog>
);

/* ── Props ───────────────────────────────────────────────────────────────── */
export interface CourseParticipantsModalProps {
  open: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle: string;
  /** All employees available to invite */
  allEmployees: EmployeeDirectoryRow[];
  /** Already-saved participants fetched from the API */
  existingParticipants: CourseParticipant[];
  isLoadingParticipants: boolean;
  /** Called with the final list of employee IDs to invite */
  onSave: (employeeIds: number[]) => Promise<void>;
  /** Called when a single participant should be removed */
  onRemoveParticipant: (participantId: number) => Promise<void>;
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export const CourseParticipantsModal: React.FC<CourseParticipantsModalProps> = ({
  open,
  onClose,
  courseId: _courseId,
  courseTitle,
  allEmployees,
  existingParticipants,
  isLoadingParticipants,
  onSave,
  onRemoveParticipant,
}) => {
  /* IDs staged for invite (not yet saved) */
  const [stagedIds, setStagedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [lastSavedCount, setLastSavedCount] = useState(0);

  /* Reset staged list whenever modal opens */
  useEffect(() => {
    if (open) {
      setStagedIds([]);
      setSaveError(null);
    }
  }, [open]);

  /* IDs already saved as participants */
  const existingEmployeeIds = useMemo(
    () => new Set(existingParticipants.map((p) => String(p.employee))),
    [existingParticipants]
  );

  /* Combobox options — exclude already-invited employees */
  const employeeOptions = useMemo(
    () =>
      allEmployees
        .filter((e) => !existingEmployeeIds.has(String(e.id)))
        .map((e) => ({
          value: String(e.id),
          label: e.full_name || `${e.first_name} ${e.last_name}`.trim(),
          sub: e.email,
        })),
    [allEmployees, existingEmployeeIds]
  );

  /* Staged employee objects for display */
  const stagedEmployees = useMemo(
    () =>
      stagedIds
        .map((id) => allEmployees.find((e) => String(e.id) === id))
        .filter(Boolean) as EmployeeDirectoryRow[],
    [stagedIds, allEmployees]
  );

  const handleComboboxChange = (ids: string[]) => setStagedIds(ids);

  const handleRemoveStaged = (id: string) =>
    setStagedIds((prev) => prev.filter((v) => v !== id));

  const handleSave = async () => {
    if (stagedIds.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(stagedIds.map(Number));
      setLastSavedCount(stagedIds.length);
      setStagedIds([]);
      setShowNotifyDialog(true);
    } catch {
      setSaveError('Failed to save participants. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifyClose = () => {
    setShowNotifyDialog(false);
  };

  const totalCount = existingParticipants.length + stagedIds.length;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onClose}
        title={`Invite Participants`}
        description={`${courseTitle} — search and add employees to this course.`}
        maxWidth="580px"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {totalCount} participant{totalCount !== 1 ? 's' : ''} total
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={stagedIds.length === 0 || isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: stagedIds.length === 0 || isSaving ? 'not-allowed' : 'pointer',
                  opacity: stagedIds.length === 0 || isSaving ? 0.5 : 1,
                  transition: 'opacity 150ms',
                }}
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Users size={14} />
                )}
                Save & Invite{stagedIds.length > 0 ? ` (${stagedIds.length})` : ''}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Search & Add section ── */}
          <div
            style={{
              padding: '14px',
              background: 'var(--color-canvas)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
                marginBottom: '8px',
              }}
            >
              Search Employees
            </label>
            <Combobox
              options={employeeOptions.filter(
                (opt) => !stagedIds.includes(opt.value)
              )}
              value={stagedIds}
              onChange={handleComboboxChange}
              placeholder="+ Search by name or email..."
            />
            <p
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                marginTop: '6px',
              }}
            >
              Select one or more employees. Already-invited participants are excluded from the list.
            </p>
          </div>

          {/* ── Staged (new) participants ── */}
          {stagedIds.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Selected — ready to invite ({stagedIds.length})
                </h4>
                <button
                  onClick={() => setStagedIds([])}
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-danger)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Clear all
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {stagedEmployees.map((emp) => (
                  <ParticipantRow
                    key={emp.id}
                    employeeId={emp.id}
                    name={emp.full_name || `${emp.first_name} ${emp.last_name}`.trim()}
                    email={emp.email}
                    code={emp.employee_code}
                    onRemove={() => handleRemoveStaged(String(emp.id))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {saveError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--color-danger)',
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {saveError}
            </div>
          )}

          {/* ── Existing participants ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              Current Participants ({existingParticipants.length})
            </h4>

            {isLoadingParticipants ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '20px',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                Loading participants...
              </div>
            ) : existingParticipants.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '28px',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-muted)',
                  gap: '8px',
                }}
              >
                <Users size={24} style={{ opacity: 0.25 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No participants invited yet.</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {existingParticipants.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    employeeId={p.employee}
                    name={p.employee_full_name}
                    email={p.employee_email}
                    code={p.employee_code}
                    onRemove={() => onRemoveParticipant(p.id)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </Dialog>

      {/* ── Notification confirmation ── */}
      <NotificationConfirmDialog
        open={showNotifyDialog}
        newCount={lastSavedCount}
        onSkip={handleNotifyClose}
        onSend={handleNotifyClose}
      />
    </>
  );
};
