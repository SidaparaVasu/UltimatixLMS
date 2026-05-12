import React from 'react';
import { format, parseISO, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import { CalendarDays, MapPin, Video, Users, Clock } from 'lucide-react';
import { useUpcomingSessions } from '@/queries/dashboard/useDashboardQueries';
import type { TrainingSession } from '@/types/dashboard.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSessionTypeIcon(type: string) {
  switch (type?.toUpperCase()) {
    case 'ONLINE': return Video;
    case 'LIVE':   return Video;
    default:       return Users; // CLASSROOM
  }
}

function getSessionTypeLabel(session: TrainingSession): string {
  switch (session.session_type?.toUpperCase()) {
    case 'ONLINE':    return session.meeting_link ? 'Online Session' : 'Online';
    case 'LIVE':      return session.location || 'Live Session';
    case 'CLASSROOM': return session.location || 'Classroom';
    default:          return session.location || session.session_type || 'Session';
  }
}

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  const diff = differenceInCalendarDays(date, new Date());
  if (diff <= 7) return `In ${diff} days`;
  return format(date, 'EEE, d MMM');
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

const SessionSkeleton: React.FC = () => (
  <>
    {[1, 2, 3].map((i) => (
      <div key={i} className="session-item">
        <div className="session-date-col">
          <div className="pulse" style={{ width: 28, height: 14, background: 'var(--color-border)', borderRadius: 4 }} />
          <div className="pulse" style={{ width: 20, height: 10, background: 'var(--color-border)', borderRadius: 4, marginTop: 4 }} />
        </div>
        <div className="session-divider" />
        <div className="session-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="pulse" style={{ height: 11, width: '75%', background: 'var(--color-border)', borderRadius: 4 }} />
          <div className="pulse" style={{ height: 10, width: '50%', background: 'var(--color-border)', borderRadius: 4 }} />
        </div>
      </div>
    ))}
  </>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CalendarPanel: React.FC = () => {
  const { data, isLoading, isError } = useUpcomingSessions();

  // API may return paginated { results: [] } or a plain array
  const sessions: TrainingSession[] = Array.isArray(data)
    ? data
    : (data as any)?.results ?? [];

  return (
    <div className="calendar-panel">
      {/* Header */}
      <div className="panel-head" style={{ padding: 0, border: 'none' }}>
        <span className="panel-title" style={{ fontSize: 'var(--text-md)' }}>Upcoming Sessions</span>
        {!isLoading && sessions.length > 0 && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {sessions.length} scheduled
          </span>
        )}
      </div>

      {/* Session list */}
      <div className="sessions-list">
        {isLoading ? (
          <SessionSkeleton />
        ) : isError ? (
          <div className="sessions-empty">
            <CalendarDays size={28} strokeWidth={1.5} />
            <span>Could not load sessions</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="sessions-empty">
            <CalendarDays size={28} strokeWidth={1.5} />
            <span>No upcoming sessions scheduled</span>
          </div>
        ) : (
          sessions.map((session) => {
            const TypeIcon = getSessionTypeIcon(session.session_type);
            const typeLabel = getSessionTypeLabel(session);
            const dateLabel = getDateLabel(session.session_start_date);
            const startDate = parseISO(session.session_start_date);
            const isUpcoming = isToday(startDate) || isTomorrow(startDate);

            return (
              <div key={session.id} className={`session-item${isUpcoming ? ' session-item--soon' : ''}`}>
                {/* Date column */}
                <div className="session-date-col">
                  <span className="session-day">{format(startDate, 'd')}</span>
                  <span className="session-mon">{format(startDate, 'MMM')}</span>
                </div>

                <div className="session-divider" />

                {/* Content */}
                <div className="session-body">
                  <div className="session-title">{session.session_title}</div>

                  <div className="session-meta">
                    <span className="session-meta-item">
                      <Clock size={11} />
                      {dateLabel}
                    </span>
                    <span className="session-meta-item">
                      <TypeIcon size={11} />
                      {typeLabel}
                    </span>
                    {session.course_title && (
                      <span className="session-meta-item session-meta-course">
                        {session.course_title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
