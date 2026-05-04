import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, SlotInfo, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enIN } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { SessionFormDrawer } from '@/components/admin/training/SessionFormDrawer';
import { SessionDetailPanel } from '@/components/admin/training/SessionDetailPanel';
import {
  useTrainingCalendars,
  useCreateCalendar,
  useTrainingSessions,
  useDeleteSession,
} from '@/queries/training/useTrainingQueries';
import { useDepartmentOptions } from '@/queries/admin/useAdminMasters';
import { TrainingSession, TrainingSessionType, TrainingSessionListParams } from '@/types/training.types';

// ── date-fns localizer ────────────────────────────────────────────────────

const locales = { 'en-IN': enIN };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ── Session type colors ───────────────────────────────────────────────────

const TYPE_COLOR: Record<TrainingSessionType, string> = {
  ONLINE:     '#2563eb',
  OFFLINE:    '#15803d',
  HYBRID:     '#7c3aed',
  SELF_PACED: '#64748b',
};

// ── Convert TrainingSession → rbc event ──────────────────────────────────

interface CalEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: TrainingSession;
}

const toEvents = (sessions: TrainingSession[]): CalEvent[] =>
  sessions.map(s => ({
    id:       s.id,
    title:    s.session_title,
    start:    new Date(s.session_start_date),
    end:      new Date(s.session_end_date),
    resource: s,
  }));

// ── Custom event component ────────────────────────────────────────────────

const EventComponent: React.FC<{ event: CalEvent }> = ({ event }) => {
  const color = TYPE_COLOR[event.resource.session_type] ?? '#64748b';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '1px 4px', overflow: 'hidden',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <span style={{ fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.title}
      </span>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function TrainingCalendarPage() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear]   = useState(currentYear);
  const [selectedDept, setSelectedDept]   = useState('');
  const [calendarDate, setCalendarDate]   = useState(new Date());
  const [view, setView]                   = useState<View>('month');

  const [formOpen, setFormOpen]           = useState(false);
  const [editTarget, setEditTarget]       = useState<TrainingSession | null>(null);
  const [defaultDate, setDefaultDate]     = useState<Date | null>(null);
  const [detailOpen, setDetailOpen]       = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

  const { data: deptOptions } = useDepartmentOptions();
  const allDepts = deptOptions ?? [];

  // ── Build session query params ────────────────────────────────────────
  // Always fetch sessions for the selected year.
  // Department filter is optional — when empty, all departments are shown.
  const sessionParams: TrainingSessionListParams = {
    year:       selectedYear,
    page_size:  500,
    ...(selectedDept ? { department: Number(selectedDept) } : {}),
  };

  const { data: sessionsData, isLoading } = useTrainingSessions(sessionParams);
  const sessions = sessionsData?.results ?? [];
  const events   = useMemo(() => toEvents(sessions), [sessions]);

  // ── Resolve calendar for creating new sessions ────────────────────────
  // We still need a specific dept+year calendar to attach new sessions to.
  const { data: calendarsData } = useTrainingCalendars(
    selectedDept ? { year: selectedYear, department: Number(selectedDept) } : undefined
  );
  const createCalendar = useCreateCalendar();
  const calendarRecord = calendarsData?.results?.[0] ?? null;
  const calendarId     = calendarRecord?.id ?? null;

  const deleteSession = useDeleteSession();

  // ── Ensure calendar exists before opening form ────────────────────────
  const ensureCalendar = async (): Promise<number | null> => {
    if (calendarId) return calendarId;
    if (!selectedDept) return null;
    const created = await createCalendar.mutateAsync({
      year:       selectedYear,
      department: Number(selectedDept),
    });
    return created?.id ?? null;
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSelectSlot = useCallback(async (slot: SlotInfo) => {
    if (!selectedDept) return;
    await ensureCalendar();
    setEditTarget(null);
    setDefaultDate(slot.start);
    setFormOpen(true);
  }, [selectedDept, calendarId]);

  const handleSelectEvent = useCallback((event: CalEvent) => {
    setSelectedSession(event.resource);
    setDetailOpen(true);
  }, []);

  const handleNewSession = async () => {
    if (!selectedDept) return;
    await ensureCalendar();
    setEditTarget(null);
    setDefaultDate(null);
    setFormOpen(true);
  };

  const handleEditFromDetail = () => {
    setDetailOpen(false);
    setEditTarget(selectedSession);
    setFormOpen(true);
  };

  const eventPropGetter = useCallback((event: CalEvent) => {
    const color = TYPE_COLOR[event.resource.session_type] ?? '#64748b';
    return {
      style: {
        backgroundColor: `${color}18`,
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '4px',
        color: 'var(--color-text-primary)',
        fontSize: '11px',
      },
    };
  }, []);

  const resolvedCalendarId = calendarId ?? 0;

  return (
    <div className="content-inner" style={{ paddingBottom: '50px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {['Admin', 'Training', 'Calendar'].map((crumb, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>/</span>}
              <span style={{ fontSize: '11px', fontWeight: i === arr.length - 1 ? 500 : 400, color: i === arr.length - 1 ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Training Calendar
          </h1>
          <button
            onClick={handleNewSession}
            disabled={!selectedDept}
            title={!selectedDept ? 'Select a department to add a session' : undefined}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-md)',
              border: 'none', background: 'var(--color-accent)', color: '#fff',
              fontSize: '13px', fontWeight: 600,
              cursor: !selectedDept ? 'not-allowed' : 'pointer',
              opacity: !selectedDept ? 0.5 : 1,
            }}
          >
            + New Session
          </button>
        </div>
        <hr style={{ marginTop: '16px', border: 'none', borderTop: '1px solid var(--color-border)' }} />
      </div>

      {/* Toolbar: Year + Department filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Year</label>
          <input
            type="number"
            className="form-input"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            min={2000}
            max={2100}
            style={{ width: '90px' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Department</label>
          <select
            className="form-input"
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{ width: '200px', cursor: 'pointer' }}
          >
            <option value="">All departments</option>
            {allDepts.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          {selectedDept && (
            <button
              onClick={() => setSelectedDept('')}
              style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
              title="Clear filter"
            >
              ✕
            </button>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {(Object.entries(TYPE_COLOR) as [TrainingSessionType, string][]).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {type.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hint when no dept selected — creating sessions requires a department */}
      {!selectedDept && (
        <div style={{
          padding: '8px 14px', marginBottom: '16px',
          background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-secondary)', fontSize: '12px',
        }}>
          Showing all sessions for {selectedYear}. Select a department to add new sessions.
        </div>
      )}

      {/* Calendar — always visible */}
      <div style={{ height: '680px' }}>
        <style>{`
          .rbc-calendar { font-family: var(--font-body); font-size: 13px; }
          .rbc-header { padding: 8px 4px; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
          .rbc-month-view { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
          .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--color-border); }
          .rbc-month-row + .rbc-month-row { border-top: 1px solid var(--color-border); }
          .rbc-off-range-bg { background: var(--color-surface-alt); }
          .rbc-today { background: rgba(37,99,235,0.04); }
          .rbc-date-cell { padding: 4px 6px; font-size: 12px; color: var(--color-text-secondary); }
          .rbc-date-cell.rbc-off-range { color: var(--color-text-muted); }
          .rbc-toolbar { margin-bottom: 16px; }
          .rbc-toolbar button { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 5px 12px; background: var(--color-surface); cursor: pointer; }
          .rbc-toolbar button:hover { background: var(--color-surface-alt); }
          .rbc-toolbar button.rbc-active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
          .rbc-toolbar .rbc-toolbar-label { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
          .rbc-show-more { font-size: 11px; color: var(--color-accent); font-weight: 600; padding: 2px 4px; }
          .rbc-event { padding: 0; background: transparent; border: none; }
          .rbc-event:focus { outline: none; }
          .rbc-event.rbc-selected { background: transparent; }
          .rbc-slot-selection { background: rgba(37,99,235,0.10); }
        `}</style>

        <Calendar
          localizer={localizer}
          events={events}
          date={calendarDate}
          view={view}
          onNavigate={setCalendarDate}
          onView={setView}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={!!selectedDept}
          eventPropGetter={eventPropGetter}
          components={{ event: EventComponent as any }}
          views={['month', 'week', 'agenda']}
          style={{ height: '100%' }}
        />
      </div>

      {/* Session Form Drawer — only available when a dept calendar is resolved */}
      {resolvedCalendarId > 0 && (
        <SessionFormDrawer
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditTarget(null); }}
          calendarId={resolvedCalendarId}
          editTarget={editTarget}
          defaultDate={defaultDate}
        />
      )}

      {/* Session Detail Panel */}
      <SessionDetailPanel
        session={selectedSession}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEditFromDetail}
      />
    </div>
  );
}
