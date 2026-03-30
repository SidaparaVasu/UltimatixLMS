import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Event {
  id: number;
  date: Date;
  title: string;
  mode: 'live' | 'online' | 'classroom';
  modeLabel: string;
}

const events: Event[] = [
  { id: 1, date: new Date(2026, 2, 7), title: 'Agile Best Practices', mode: 'online', modeLabel: 'Online Session' },
  { id: 2, date: new Date(2026, 2, 14), title: 'Design Patterns', mode: 'classroom', modeLabel: 'Room 402' },
  { id: 3, date: new Date(2026, 2, 21), title: 'Cloud Security Audit', mode: 'online', modeLabel: 'Online MS Teams' },
  { id: 4, date: new Date(2026, 2, 30), title: 'AI Ethics Workshop', mode: 'live', modeLabel: 'Main Auditorium' },
];

export const CalendarPanel: React.FC = () => {
  // Hardcoding March 2026 for design consistency, but making it fully functional
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const today = new Date(2026, 2, 30); // Hardcoded today as per design requirement

  const renderHeader = () => {
    return (
      <div className="cal-header">
        <span className="cal-month">{format(currentDate, 'MMMM yyyy')}</span>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft size={16} />
          </button>
          <button className="cal-nav-btn" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return (
      <div className="cal-days-header">
        {days.map((day) => (
          <div key={day} className="cal-day-name">{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        
        const hasEvent = events.some(e => isSameDay(e.date, cloneDay));
        const isToday = isSameDay(cloneDay, today);
        const isMuted = !isSameMonth(cloneDay, monthStart);

        let cellClass = 'cal-cell';
        if (isMuted) cellClass += ' muted';
        if (isToday) cellClass += ' today';
        if (hasEvent) cellClass += ' event';

        days.push(
          <div 
            key={day.toString()} 
            className={cellClass}
            style={{marginTop: "3px"}}
          >
            {formattedDate}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="cal-grid" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  const renderUpcoming = () => {
    // Filter events for the current month and future
    return (
      <div className="cal-events-list">
        {events.slice(0, 2).map((event) => (
          <div key={event.id} className="cal-event-item">
            <div className="cal-event-date">
              <span className="cal-event-day">{format(event.date, 'dd')}</span>
              <span className="cal-event-mon">{format(event.date, 'MMM')}</span>
            </div>
            <div className="cal-event-info">
              <div className="cal-event-title">{event.title}</div>
              <span className={`cal-event-mode-badge mode-${event.mode}`}>
                {event.modeLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="calendar-panel">
      {renderHeader()}
      <div>
        {renderDays()}
        {renderCells()}
      </div>
      <div className="section-header" style={{ marginBottom: 'var(--space-2)' }}>
        <span className="section-title" style={{ fontSize: 'var(--text-sm)' }}>Upcoming Events</span>
      </div>
      {renderUpcoming()}
    </div>
  );
};
