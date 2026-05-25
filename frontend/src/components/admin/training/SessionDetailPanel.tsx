import React, { useState } from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { EnrollmentRoster } from './EnrollmentRoster';
import { AttendanceSheet } from './AttendanceSheet';
import { TrainingSession, TrainingSessionType } from '@/types/training.types';

const TYPE_COLOR: Record<TrainingSessionType, { color: string; bg: string }> = {
  ONLINE:     { color: '#2563eb', bg: 'rgba(37,99,235,0.10)' },
  OFFLINE:    { color: '#15803d', bg: 'rgba(21,128,61,0.10)' },
  HYBRID:     { color: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
  SELF_PACED: { color: '#64748b', bg: 'var(--color-surface-alt)' },
};

type Tab = 'details' | 'enrollment' | 'attendance';

interface SessionDetailPanelProps {
  session: TrainingSession | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  canManage?: boolean;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' }}>
    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
      {label}
    </span>
    <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{children}</span>
  </div>
);

export const SessionDetailPanel: React.FC<SessionDetailPanelProps> = ({
  session, open, onClose, onEdit, canManage = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  if (!session) return null;

  const typeStyle = TYPE_COLOR[session.session_type] ?? TYPE_COLOR.ONLINE;

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '7px 14px',
    fontSize: '13px',
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-muted)',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  });

  return (
    <Drawer
      open={open}
      onOpenChange={onClose}
      position="right"
      size="500px"
      hideCloseButton={false}
      title={session.session_title}
    >
      {/* Type badge + Edit button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '3px 10px', borderRadius: '999px',
            fontSize: '11px', fontWeight: 600,
            color: typeStyle.color, background: typeStyle.bg,
          }}>
            {session.session_type.replace('_', ' ')}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {session.current_enrollments} / {session.capacity} enrolled
          </span>
        </div>
        {canManage && (
          <button
            onClick={onEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'transparent',
              fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
        <button style={tabStyle('details')}    onClick={() => setActiveTab('details')}>Details</button>
        {canManage && (
          <>
            <button style={tabStyle('enrollment')} onClick={() => setActiveTab('enrollment')}>Enrollment</button>
            <button style={tabStyle('attendance')} onClick={() => setActiveTab('attendance')}>Attendance</button>
          </>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div>
          {session.course_title && (
            <DetailRow label="Course">{session.course_title}</DetailRow>
          )}
          <DetailRow label="Start">{fmt(session.session_start_date)}</DetailRow>
          <DetailRow label="End">{fmt(session.session_end_date)}</DetailRow>
          <DetailRow label="Capacity">{session.capacity} participants</DetailRow>

          {session.meeting_link && (
            <DetailRow label="Meeting Link">
              <a
                href={session.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {session.meeting_link.length > 40
                  ? session.meeting_link.slice(0, 40) + '…'
                  : session.meeting_link}
                <ExternalLink size={12} />
              </a>
            </DetailRow>
          )}

          {session.location && (
            <DetailRow label="Location">{session.location}</DetailRow>
          )}
        </div>
      )}

      {activeTab === 'enrollment' && (
        <EnrollmentRoster sessionId={session.id} capacity={session.capacity} />
      )}

      {activeTab === 'attendance' && (
        <AttendanceSheet sessionId={session.id} />
      )}
    </Drawer>
  );
};
