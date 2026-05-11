import React, { useState } from 'react';
import { History, Trophy, User, Users, Settings, ArrowRight } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell } from '@/components/ui/table';
import { useSkillHistoryList } from '@/queries/admin/useSkillHistoryQueries';
import { SkillHistoryEntry, SkillChangeReason } from '@/types/skill-history.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Reason badge ──────────────────────────────────────────────────────────────

const REASON_CONFIG: Record<SkillChangeReason, {
  label: string;
  icon: React.ElementType;
  bg: string;
  color: string;
}> = {
  ASSESSMENT_AUTO:     { label: 'Assessment (Auto)',     icon: Trophy,   bg: 'rgba(37,99,235,0.08)',  color: '#1d4ed8' },
  ASSESSMENT_APPROVED: { label: 'Assessment (Approved)', icon: Trophy,   bg: 'rgba(37,99,235,0.08)',  color: '#1d4ed8' },
  MANAGER_RATING:      { label: 'Manager Rating',        icon: Users,    bg: 'rgba(124,58,237,0.08)', color: '#6d28d9' },
  SELF_RATING:         { label: 'Self Rating',           icon: User,     bg: 'rgba(107,114,128,0.1)', color: '#4b5563' },
  ADMIN_OVERRIDE:      { label: 'Admin Override',        icon: Settings, bg: 'rgba(217,119,6,0.08)',  color: '#b45309' },
};

function ReasonBadge({ reason }: { reason: SkillChangeReason }) {
  const cfg = REASON_CONFIG[reason] ?? REASON_CONFIG.ADMIN_OVERRIDE;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Level change cell ─────────────────────────────────────────────────────────

function LevelChange({ entry }: { entry: SkillHistoryEntry }) {
  const isUpgrade = (entry.new_level_rank ?? 0) > (entry.old_level_rank ?? 0);
  const isNew     = entry.old_level === null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
      {isNew ? (
        <span style={{
          padding: '2px 8px', borderRadius: '999px',
          background: 'rgba(22,163,74,0.08)', color: '#15803d',
          fontSize: '11px', fontWeight: 600,
        }}>
          New — {entry.new_level_name ?? '—'}
        </span>
      ) : (
        <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
            {entry.old_level_name ?? '—'}
          </span>
          <ArrowRight size={12} style={{ color: isUpgrade ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
          <span style={{
            fontWeight: 700,
            color: isUpgrade ? '#15803d' : '#dc2626',
          }}>
            {entry.new_level_name ?? '—'}
          </span>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: '',                   label: 'All reasons' },
  { value: 'ASSESSMENT_AUTO',    label: 'Assessment (Auto)' },
  { value: 'ASSESSMENT_APPROVED',label: 'Assessment (Approved)' },
  { value: 'MANAGER_RATING',     label: 'Manager Rating' },
  { value: 'SELF_RATING',        label: 'Self Rating' },
  { value: 'ADMIN_OVERRIDE',     label: 'Admin Override' },
];

export default function SkillHistoryPage() {
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  const { data, isLoading, error } = useSkillHistoryList({
    page,
    page_size: PAGE_SIZE,
    ...(reasonFilter ? { change_reason: reasonFilter as SkillChangeReason } : {}),
  });

  const items = data?.results ?? [];
  const total = data?.count ?? 0;

  // Client-side employee name search (backend doesn't support text search on history)
  const filtered = search.trim()
    ? items.filter(e =>
        e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        e.skill_name.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const columns: DataTableColumn<SkillHistoryEntry>[] = [
    {
      type: 'custom',
      header: 'Employee',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {row.employee_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {row.employee_code}
          </p>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Skill',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {row.skill_name}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Level Change',
      render: (row) => (
        <TableCell>
          <LevelChange entry={row} />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Reason',
      render: (row) => (
        <TableCell>
          <ReasonBadge reason={row.change_reason} />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Changed By',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {row.changed_by_name ?? <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>System</span>}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Date',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {formatDate(row.changed_at)}
          </span>
        </TableCell>
      ),
    },
  ];

  return (
    <AdminMasterLayout
      title="Skill History"
      description="Audit log of all employee skill level changes across your organisation."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Skill History' },
      ]}
      resultCount={total}
      searchTerm={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      searchPlaceholder="Search by employee or skill..."
      filterSlot={
        <select
          className="form-input"
          value={reasonFilter}
          onChange={e => { setReasonFilter(e.target.value); setPage(1); }}
          style={{ width: '180px', cursor: 'pointer', flexShrink: 0 }}
        >
          {REASON_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      }
    >
      <div className='pb-10'>
        {total === 0 && !isLoading && !error ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-16) var(--space-8)',
            border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-muted)',
          }}>
            <History size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No skill history found</p>
            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
              Skill level changes will appear here as employees complete assessments and ratings.
            </p>
          </div>
        ) : (
          <AdminDataTable<SkillHistoryEntry>
            rowKey="id"
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            error={error}
            emptyMessage="No skill history records found."
            skeletonRowCount={8}
            pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
          />
        )}
      </div>
    </AdminMasterLayout>
  );
}
