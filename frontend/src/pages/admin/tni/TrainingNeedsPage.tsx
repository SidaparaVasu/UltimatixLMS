import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrainingNeeds } from '@/queries/tni/useTNIQueries';
import { tniApi } from '@/api/tni-api';
import { TrainingNeed, TNIStatus, TNIPriority, TNISourceType, TNIApprovalStatus } from '@/types/tni.types';
import { TrainingNeedApprovalDialog } from '@/components/tni/TrainingNeedApprovalDialog';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableActionButton, TableActionCell } from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Badge configs
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<TNIStatus, string> = {
  PENDING:   '#b45309',
  APPROVED:  '#15803d',
  REJECTED:  '#dc2626',
  PLANNED:   '#2563eb',
  COMPLETED: '#64748b',
};
const STATUS_BG: Record<TNIStatus, string> = {
  PENDING:   'rgba(217,119,6,0.10)',
  APPROVED:  'rgba(26,158,58,0.10)',
  REJECTED:  'rgba(220,38,38,0.10)',
  PLANNED:   'rgba(37,99,235,0.10)',
  COMPLETED: 'var(--color-surface-alt)',
};

const PRIORITY_COLOR: Record<TNIPriority, string> = {
  CRITICAL: '#dc2626',
  HIGH:     '#b45309',
  MEDIUM:   '#ca8a04',
  LOW:      '#64748b',
};
const PRIORITY_BG: Record<TNIPriority, string> = {
  CRITICAL: 'rgba(220,38,38,0.10)',
  HIGH:     'rgba(217,119,6,0.10)',
  MEDIUM:   'rgba(234,179,8,0.10)',
  LOW:      'var(--color-surface-alt)',
};

const SOURCE_LABEL: Record<TNISourceType, string> = {
  SKILL_GAP:  'Skill Gap',
  SELF:       'Self',
  MANAGER:    'Manager',
  COMPLIANCE: 'Compliance',
  SYSTEM:     'System',
};
const SOURCE_COLOR: Record<TNISourceType, string> = {
  SKILL_GAP:  '#2563eb',
  SELF:       '#7c3aed',
  MANAGER:    '#0891b2',
  COMPLIANCE: '#b45309',
  SYSTEM:     '#64748b',
};
const SOURCE_BG: Record<TNISourceType, string> = {
  SKILL_GAP:  'rgba(37,99,235,0.10)',
  SELF:       'rgba(124,58,237,0.10)',
  MANAGER:    'rgba(8,145,178,0.10)',
  COMPLIANCE: 'rgba(217,119,6,0.10)',
  SYSTEM:     'var(--color-surface-alt)',
};

// ---------------------------------------------------------------------------
// Inline badge helper
// ---------------------------------------------------------------------------

const Pill: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 10px', borderRadius: '999px',
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em',
    color, background: bg, whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

export default function TrainingNeedsPage() {
  const queryClient = useQueryClient();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter]     = useState<TNIStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TNIPriority | ''>('');
  const [sourceFilter, setSourceFilter]     = useState<TNISourceType | ''>('');

  // ── Approval dialog state ─────────────────────────────────────────────────
  const [approvalTarget, setApprovalTarget] = useState<TrainingNeed | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useTrainingNeeds({
    status:      statusFilter   || undefined,
    priority:    priorityFilter || undefined,
    source_type: sourceFilter   || undefined,
    page,
    page_size:   PAGE_SIZE,
  });

  const needs = data?.results ?? [];
  const total = data?.count   ?? 0;

  // ── Approval mutation ─────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ needId, status, comments }: { needId: number; status: TNIApprovalStatus; comments: string }) =>
      status === 'APPROVED'
        ? tniApi.approveTrainingNeed(needId, comments)
        : tniApi.rejectTrainingNeed(needId, comments),
    onSuccess: () => {
      // refetchQueries forces immediate re-render with updated status
      queryClient.refetchQueries({ queryKey: ['tni', 'training-needs'] });
      setApprovalTarget(null);
    },
  });

  const handleFinalize = (status: TNIApprovalStatus, comments: string) => {
    if (!approvalTarget) return;
    approveMutation.mutate({ needId: approvalTarget.id, status, comments });
  };

  // ── Client-side search filter (on top of server filters) ─────────────────
  const filtered = search.trim()
    ? needs.filter(n =>
        n.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
        n.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
        n.skill_name?.toLowerCase().includes(search.toLowerCase())
      )
    : needs;

  // ── Active filter chips ───────────────────────────────────────────────────
  const activeFilters: [string, string][] = [
    ...(statusFilter   ? [['status',   statusFilter]   as [string, string]] : []),
    ...(priorityFilter ? [['priority', priorityFilter] as [string, string]] : []),
    ...(sourceFilter   ? [['source',   sourceFilter]   as [string, string]] : []),
  ];

  const handleRemoveFilter = (key: string) => {
    if (key === 'status')   setStatusFilter('');
    if (key === 'priority') setPriorityFilter('');
    if (key === 'source')   setSourceFilter('');
    setPage(1);
  };

  // ── Column definitions ────────────────────────────────────────────────────
  const columns: DataTableColumn<TrainingNeed>[] = [
    {
      type: 'custom',
      header: 'Employee',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {row.employee_name || '—'}
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
      header: 'Level Gap',
      width: '160px',
      render: (row) => (
        <TableCell>
          {row.required_level_name || row.current_level_name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px',
                background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}>
                {row.current_level_name ?? '—'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>→</span>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px',
                background: 'rgba(37,99,235,0.08)', color: '#2563eb',
                border: '1px solid rgba(37,99,235,0.20)',
              }}>
                {row.required_level_name ?? '—'}
              </span>
              {row.gap_value != null && row.gap_value > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px',
                  background: row.gap_value >= 2 ? 'rgba(220,38,38,0.10)' : 'rgba(217,119,6,0.10)',
                  color: row.gap_value >= 2 ? '#dc2626' : '#b45309',
                }}>
                  {row.gap_value >= 2 ? '▼▼' : '▼'} {row.gap_value}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>—</span>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Priority',
      width: '100px',
      render: (row) => (
        <TableCell>
          <Pill
            label={row.priority}
            color={PRIORITY_COLOR[row.priority] ?? 'var(--color-text-muted)'}
            bg={PRIORITY_BG[row.priority] ?? 'var(--color-surface-alt)'}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Source',
      width: '110px',
      render: (row) => (
        <TableCell>
          <Pill
            label={SOURCE_LABEL[row.source_type] ?? row.source_type}
            color={SOURCE_COLOR[row.source_type] ?? 'var(--color-text-muted)'}
            bg={SOURCE_BG[row.source_type] ?? 'var(--color-surface-alt)'}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      width: '110px',
      render: (row) => (
        <TableCell>
          <Pill
            label={row.status}
            color={STATUS_COLOR[row.status] ?? 'var(--color-text-muted)'}
            bg={STATUS_BG[row.status] ?? 'var(--color-surface-alt)'}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Identified',
      width: '120px',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {new Date(row.identified_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Actions',
      width: '120px',
      render: (row) => (
        <TableActionCell>
          {row.status === 'PENDING' ? (
            <TableActionButton
              variant="primary"
              onClick={() => setApprovalTarget(row)}
            >
              Review
            </TableActionButton>
          ) : (
            <TableActionButton
              variant="secondary"
              onClick={() => setApprovalTarget(row)}
            >
              View
            </TableActionButton>
          )}
        </TableActionCell>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminMasterLayout
        title="Training Needs"
        description="Review and approve identified training needs for your team."
        // icon={ClipboardCheck}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'TNI' },
          { label: 'Training Needs' },
        ]}
        searchPlaceholder="Search by employee or skill…"
        searchTerm={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        resultCount={total}
        filterSlot={
          <>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as TNIStatus | ''); setPage(1); }}
              style={{ width: '140px', cursor: 'pointer', flexShrink: 0 }}
            >
              <option value="">Status: All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PLANNED">Planned</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              className="form-input"
              value={priorityFilter}
              onChange={e => { setPriorityFilter(e.target.value as TNIPriority | ''); setPage(1); }}
              style={{ width: '150px', cursor: 'pointer', flexShrink: 0 }}
            >
              <option value="">Priority: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              className="form-input"
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value as TNISourceType | ''); setPage(1); }}
              style={{ width: '150px', cursor: 'pointer', flexShrink: 0 }}
            >
              <option value="">Source: All</option>
              <option value="SKILL_GAP">Skill Gap</option>
              <option value="SELF">Self</option>
              <option value="MANAGER">Manager</option>
              <option value="COMPLIANCE">Compliance</option>
              <option value="SYSTEM">System</option>
            </select>
          </>
        }
        chips={{
          activeFilters,
          onRemove: handleRemoveFilter,
          onClearAll: () => {
            setStatusFilter('');
            setPriorityFilter('');
            setSourceFilter('');
            setPage(1);
          },
          getKeyLabel: (k) => ({ status: 'Status', priority: 'Priority', source: 'Source' }[k] ?? k),
        }}
      >
        <AdminDataTable<TrainingNeed>
          rowKey="id"
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          error={error}
          emptyMessage="No training needs found."
          skeletonRowCount={8}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
        />
      </AdminMasterLayout>

      {/* Approval dialog */}
      <TrainingNeedApprovalDialog
        open={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        trainingNeed={approvalTarget}
        onFinalize={handleFinalize}
        isLoading={approveMutation.isPending}
      />
    </>
  );
}


