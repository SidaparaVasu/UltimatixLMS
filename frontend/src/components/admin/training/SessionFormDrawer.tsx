import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { useCreateSession, useUpdateSession } from '@/queries/training/useTrainingQueries';
import { useCourses } from '@/queries/admin/useAdminMasters';
import { TrainingSession, TrainingSessionType, CreateTrainingSessionPayload } from '@/types/training.types';

interface DeptOption {
  id: number;
  name: string;
}

interface SessionFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Resolved calendar ID — null when no dept is pre-selected */
  calendarId: number | null;
  /** Year used to auto-create a calendar if needed */
  selectedYear: number;
  /** Pre-selected department from the page filter (may be empty string) */
  selectedDept: string;
  /** All available departments for the inline picker */
  allDepts: DeptOption[];
  /** Resolves (or creates) a calendar for the given dept+year, returns its ID */
  ensureCalendar: (deptId: number) => Promise<number | null>;
  editTarget: TrainingSession | null;
  defaultDate?: Date | null;
}

interface SessionForm {
  session_title: string;
  course: string;
  session_type: TrainingSessionType;
  session_start_date: string;
  session_end_date: string;
  capacity: string;
  location: string;
  meeting_link: string;
  department: string; // only used when calendarId is null (no pre-selected dept)
}

const EMPTY: SessionForm = {
  session_title: '',
  course: '',
  session_type: 'ONLINE',
  session_start_date: '',
  session_end_date: '',
  capacity: '30',
  location: '',
  meeting_link: '',
  department: '',
};

const toDatetimeLocal = (iso: string) => iso ? iso.slice(0, 16) : '';

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <span style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '3px', display: 'block' }}>{msg}</span> : null;

export const SessionFormDrawer: React.FC<SessionFormDrawerProps> = ({
  open, onClose, calendarId, selectedYear, selectedDept, allDepts, ensureCalendar, editTarget, defaultDate,
}) => {
  const isEdit = !!editTarget;
  const [form, setForm] = useState<SessionForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SessionForm, string>>>({});

  // Whether the page already has a dept selected (edit always has a calendar)
  const hasDeptContext = isEdit || !!selectedDept || !!calendarId;

  const { data: coursesData } = useCourses({ page_size: 200, is_active: true });
  const allCourses = coursesData?.results ?? [];

  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const isSaving = createSession.isPending || updateSession.isPending;

  useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm({
          session_title:      editTarget.session_title,
          course:             editTarget.course != null ? String(editTarget.course) : '',
          session_type:       editTarget.session_type,
          session_start_date: toDatetimeLocal(editTarget.session_start_date),
          session_end_date:   toDatetimeLocal(editTarget.session_end_date),
          capacity:           String(editTarget.capacity),
          location:           editTarget.location ?? '',
          meeting_link:       editTarget.meeting_link ?? '',
          department:         selectedDept,
        });
      } else {
        const base = defaultDate ? defaultDate.toISOString().slice(0, 16) : '';
        setForm({ ...EMPTY, session_start_date: base, department: selectedDept });
      }
      setErrors({});
    }
  }, [open, editTarget, defaultDate, selectedDept]);

  const setField = <K extends keyof SessionForm>(k: K, v: SessionForm[K]) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.session_title.trim()) e.session_title = 'Title is required.';
    if (!form.session_start_date)   e.session_start_date = 'Start date is required.';
    if (!form.session_end_date)     e.session_end_date = 'End date is required.';
    if (form.session_start_date && form.session_end_date && form.session_end_date < form.session_start_date) {
      e.session_end_date = 'End must be after start.';
    }
    // Department is required only when creating a new session without a pre-selected dept
    if (!isEdit && !hasDeptContext && !form.department) {
      e.department = 'Department is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Resolve the calendar ID — use existing one or create for the chosen dept
    let resolvedCalendarId = calendarId;
    if (!resolvedCalendarId) {
      const deptId = Number(form.department || selectedDept);
      resolvedCalendarId = await ensureCalendar(deptId);
    }
    if (!resolvedCalendarId) return; // ensureCalendar failed

    const payload: CreateTrainingSessionPayload = {
      calendar:           resolvedCalendarId,
      session_title:      form.session_title.trim(),
      course:             form.course ? Number(form.course) : null,
      session_type:       form.session_type,
      session_start_date: form.session_start_date,
      session_end_date:   form.session_end_date,
      capacity:           Number(form.capacity) || 30,
      location:           ['OFFLINE', 'HYBRID'].includes(form.session_type) ? form.location : '',
      meeting_link:       ['ONLINE', 'HYBRID'].includes(form.session_type) ? form.meeting_link : '',
    };
    if (isEdit && editTarget) {
      await updateSession.mutateAsync({ id: editTarget.id, payload });
    } else {
      await createSession.mutateAsync(payload);
    }
    onClose();
  };

  const showLocation    = ['OFFLINE', 'HYBRID'].includes(form.session_type);
  const showMeetingLink = ['ONLINE', 'HYBRID'].includes(form.session_type);

  return (
    <Drawer
      open={open}
      onOpenChange={onClose}
      position="right"
      size="480px"
      title={isEdit ? 'Edit Session' : 'New Session'}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-md)',
              border: 'none', background: 'var(--color-accent)', color: '#fff',
              fontSize: '13px', fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            {isSaving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Session'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

        {/* Department — only shown when no dept is pre-selected from the page filter */}
        {!hasDeptContext && (
          <div className="form-group">
            <label className="form-label">Department <span className="input-requied"> *</span></label>
            <select
              className="form-input"
              value={form.department}
              onChange={e => setField('department', e.target.value)}
              style={{ width: '100%', cursor: 'pointer', borderColor: errors.department ? 'var(--color-danger)' : undefined }}
            >
              <option value="">— Select department —</option>
              {allDepts.map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
            <FieldError msg={errors.department} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Session Title <span className="input-requied"> *</span></label>
          <input
            type="text"
            className="form-input"
            value={form.session_title}
            onChange={e => setField('session_title', e.target.value)}
            placeholder="e.g. Python Basics — Batch 1"
            style={{ width: '100%', borderColor: errors.session_title ? 'var(--color-danger)' : undefined }}
          />
          <FieldError msg={errors.session_title} />
        </div>

        <div className="form-group">
          <label className="form-label">Course</label>
          <select
            className="form-input"
            value={form.course}
            onChange={e => setField('course', e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <option value="">— No specific course —</option>
            {allCourses.map(c => (
              <option key={c.id} value={String(c.id)}>{c.course_title}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Session Type <span className="input-requied"> *</span></label>
            <select
              className="form-input"
              value={form.session_type}
              onChange={e => setField('session_type', e.target.value as TrainingSessionType)}
              style={{ width: '100%', cursor: 'pointer' }}
            >
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="HYBRID">Hybrid</option>
              <option value="SELF_PACED">Self Paced</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Capacity</label>
            <input
              type="number"
              className="form-input"
              value={form.capacity}
              onChange={e => setField('capacity', e.target.value)}
              min={1}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Start <span className="input-requied"> *</span></label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.session_start_date}
              onChange={e => setField('session_start_date', e.target.value)}
              style={{ width: '100%', borderColor: errors.session_start_date ? 'var(--color-danger)' : undefined }}
            />
            <FieldError msg={errors.session_start_date} />
          </div>
          <div className="form-group">
            <label className="form-label">End <span className="input-requied"> *</span></label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.session_end_date}
              onChange={e => setField('session_end_date', e.target.value)}
              style={{ width: '100%', borderColor: errors.session_end_date ? 'var(--color-danger)' : undefined }}
            />
            <FieldError msg={errors.session_end_date} />
          </div>
        </div>

        {showMeetingLink && (
          <div className="form-group">
            <label className="form-label">Meeting Link</label>
            <input
              type="url"
              className="form-input"
              value={form.meeting_link}
              onChange={e => setField('meeting_link', e.target.value)}
              placeholder="https://zoom.us/j/..."
              style={{ width: '100%' }}
            />
          </div>
        )}

        {showLocation && (
          <div className="form-group">
            <label className="form-label">Location / Venue</label>
            <input
              type="text"
              className="form-input"
              value={form.location}
              onChange={e => setField('location', e.target.value)}
              placeholder="e.g. Conference Room A, Floor 3"
              style={{ width: '100%' }}
            />
          </div>
        )}

      </div>
    </Drawer>
  );
};
