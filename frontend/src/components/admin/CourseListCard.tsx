import React from 'react';
import {
  BookOpen, Clock, LayoutList, FileText,
  CalendarDays, Users, Pencil, CircleX,
  Bolt, Eye, EyeOff, UserPlus,
} from 'lucide-react';
import { CourseMaster } from '@/types/courses.types';
import { TableStatusBadge } from '@/components/ui/table';

/* ── Difficulty badge ─────────────────────────────────────────────────────── */
const DIFFICULTY_STYLE: Record<string, { bg: string; color: string }> = {
  BEGINNER:     { bg: 'rgba(137,137,137,0.10)', color: '#4f4f4f' },
  INTERMEDIATE: { bg: 'rgba(243, 147, 68, 0.16)',  color: 'var(--color-warning)' },
  ADVANCED:     { bg: 'rgba(26, 68, 158, 0.08)',   color: 'var(--color-accent)' },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  BEGINNER:     'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED:     'Advanced',
};

/* ── Status badge ─────────────────────────────────────────────────────────── */
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: 'var(--color-surface-alt)',    color: 'var(--color-text-muted)' },
  PUBLISHED: { bg: 'rgba(26, 68, 158, 0.08)',    color: 'var(--color-accent)' },
  ARCHIVED:  { bg: 'var(--color-surface-alt)',    color: 'var(--color-text-muted)' },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:    'Draft',
  PUBLISHED:'Published',
  ARCHIVED: 'Archived',
};

/* ── Pill badge ───────────────────────────────────────────────────────────── */
const Pill: React.FC<{ bg: string; color: string; children: React.ReactNode }> = ({
  bg, color, children,
}) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 9px', borderRadius: '999px',
    background: bg, color,
    fontSize: '11px', fontWeight: 500,
    letterSpacing: '0.01em', whiteSpace: 'nowrap',
  }}>
    {children}
  </span>
);

/* ── Stat item ────────────────────────────────────────────────────────────── */
const Stat: React.FC<{ icon: React.ElementType; value: string | number; label?: string }> = ({
  icon: Icon, value, label,
}) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
    <Icon size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
    <b style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: '12px' }}>{value}</b>
    {label && <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>}
  </span>
);

/* ── Action icon button ───────────────────────────────────────────────────── */
const ActionBtn: React.FC<{
  icon: React.ElementType;
  title: string;
  color?: string;
  hoverBg?: string;
  onClick: () => void;
}> = ({ icon: Icon, title, color = 'var(--color-text-muted)', hoverBg = 'var(--color-surface-alt)', onClick }) => (
  <button
    title={title}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '32px', height: '32px',
      borderRadius: 'var(--radius-sm)', border: 'none',
      background: 'transparent', color, cursor: 'pointer',
      transition: 'background 150ms', flexShrink: 0,
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = hoverBg; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
  >
    <Icon size={15} strokeWidth={1.75} />
  </button>
);

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return 'Not set';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/* ── Props ────────────────────────────────────────────────────────────────── */
export interface CourseListCardProps {
  course: CourseMaster;
  categoryName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onBuild: () => void;
  onParticipants: () => void;
}

/* ── Component ────────────────────────────────────────────────────────────── */
export const CourseListCard: React.FC<CourseListCardProps> = ({
  course, categoryName, onEdit, onDelete, onBuild, onParticipants,
}) => {
  const diffStyle   = DIFFICULTY_STYLE[course.difficulty_level ?? ''] ?? DIFFICULTY_STYLE.BEGINNER;
  const statusStyle = STATUS_STYLE[course.status] ?? STATUS_STYLE.DRAFT;
  const isPublished = course.status === 'PUBLISHED';
  const sectionCount = course.sections?.length ?? 0;
  const lessonCount  = course.sections?.reduce((acc, s) => acc + (s.lessons?.length ?? 0), 0) ?? 0;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'box-shadow 200ms, border-color 200ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 0 1px 1px var(--color-border)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'none';
      }}
    >
      {/* ── Main body ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '14px 18px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Row 1: Title + code + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {course.course_title}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            {course.course_code}
          </span>
          <span style={{ marginLeft: 'auto' }}>
            <Pill bg={statusStyle.bg} color={statusStyle.color}>
              {STATUS_LABEL[course.status] ?? course.status}
            </Pill>
          </span>
        </div>

        {/* Row 2: Description */}
        {course.description && (
          <p style={{
            fontSize: '12px', color: 'var(--color-text-secondary)',
            lineHeight: 1.6, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {course.description}
          </p>
        )}

        {/* Row 3: Stats */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Stat icon={Clock}      value={course.estimated_duration_hours} label="hrs" />
          <Stat icon={LayoutList} value={sectionCount} label="sections" />
          <Stat icon={FileText}   value={lessonCount}  label="lessons" />
          {categoryName && <Stat icon={BookOpen} value={categoryName} />}
        </div>

        {/* Row 4: Dates + visibility + participants */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            <CalendarDays size={12} style={{ flexShrink: 0 }} />
            {formatDate(course.start_date)} → {formatDate(course.end_date)}
          </span>

          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontWeight: 500,
            color: isPublished ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}>
            {isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
            {isPublished ? 'Visible to participants' : 'Hidden from participants'}
          </span>

          {(course.participant_count ?? 0) > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <Users size={12} />
              <b style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{course.participant_count}</b>
              participants
            </span>
          )}
        </div>

        {/* Row 5: Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {course.difficulty_level && (
            <Pill bg={diffStyle.bg} color={diffStyle.color}>
              {DIFFICULTY_LABEL[course.difficulty_level] ?? course.difficulty_level}
            </Pill>
          )}
          <TableStatusBadge variant={course.is_active ? 'active' : 'inactive'}>
            {course.is_active ? 'Active' : 'Inactive'}
          </TableStatusBadge>
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '2px', padding: '12px 10px',
        borderLeft: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <ActionBtn
          icon={Pencil} title="Edit course"
          color="var(--color-accent)" hoverBg="var(--color-accent-subtle)"
          onClick={onEdit}
        />
        <ActionBtn
          icon={UserPlus} title="Manage participants"
          color="var(--color-accent)" hoverBg="var(--color-accent-subtle)"
          onClick={onParticipants}
        />
        <ActionBtn
          icon={CircleX} title="Deactivate course"
          color="var(--color-danger)" hoverBg="rgba(163,45,45,0.08)"
          onClick={onDelete}
        />

        {/* Build button */}
        <button
          title="Open course builder"
          onClick={(e) => { e.stopPropagation(); onBuild(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            marginTop: '6px', padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-accent)',
            background: 'var(--color-accent)', color: 'white',
            fontSize: '11px', fontWeight: 500,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <Bolt size={12} />
        </button>
      </div>
    </div>
  );
};