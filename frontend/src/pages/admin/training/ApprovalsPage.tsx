import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableActionCell, TableActionButton } from '@/components/ui/table';
import {
  useTrainingApprovals,
  useFinalizeApproval,
} from '@/queries/training/useTrainingQueries';
import {
  TrainingPlanApproval,
  TrainingApprovalStatus,
  TrainingApprovalListParams,
} from '@/types/training.types';

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_COLOR: Record<TrainingApprovalStatus, string> = {
  PENDING:  '#b45309',
  APPROVED: '#15803d',
  REJECTED: '#dc2626',
};
const STATUS_BG: Record<TrainingApprovalStatus, string> = {
  PENDING:  'rgba(217,119,6,0.10)',
  APPROVED: 'rgba(21,128,61,0.10)',
  REJECTED: 'rgba(220,38,38,0.10)',
};

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

// ── Approval Action Dialog ────────────────────────────────────────────────

interface ApprovalDialogProps {
  approval: TrainingPlanApproval | null;
  onClose: () => void;
}

const ApprovalActionDialog: React.FC<ApprovalDialogProps> = ({ approval, onClose }) => {
  const [comments, setComments] = useState('');
  const [error, setError]       = useState('');
  const finalize = useFinalizeApproval();

  if (!approval) return null;

  const handleAction = (status: 'APPROVED' | 'REJECTED') => {
    if (!comments.trim()) { setError('Comments are required.'); return; }
    finalize.mutate(
      { id: approval.id, payload: { status, comments: comments.trim() } },
      { onSuccess: () => { onClose(); setComments(''); setError(''); } }
    );
  };

  const isPending = approval.approval_status === 'PENDING';

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        width: '500px',
        maxWidth: '95vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {isPending ? 'Review Training Plan' : 'Approval Details'}
        </h2>

        {/* Plan summary */}
        <div style={{
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {[
            { label: 'Plan',       value: approval.training_plan_name ?? `Plan #${approval.training_plan}` },
            { label: 'Department', value: approval.training_plan_department ?? '—' },
            { label: 'Year',       value: String(approval.training_plan_year ?? '—') },
            { label: 'Submitted By', value: approval.submitted_by_name ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', marginRight: '6px' }}>{label}:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Existing comments (non-pending) */}
        {!isPending && approval.comments && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Comments: </span>
            {approval.comments}
          </div>
        )}

        {/* Comments input — only for pending */}
        {isPending && (
          <div className="form-group">
            <label className="form-label">
              Comments <span className="input-requied"> *</span>
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={comments}
              onChange={e => { setComments(e.target.value); setError(''); }}
              placeholder="Enter approval or rejection comments…"
              style={{ width: '100%', resize: 'vertical', minHeight: '80px', padding: '10px' }}
            />
            {error && (
              <span style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>
                {error}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-secondary)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isPending ? 'Cancel' : 'Close'}
          </button>
          {isPending && (
            <>
              <button
                onClick={() => handleAction('REJECTED')}
                disabled={finalize.isPending}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid #dc2626',
                  background: 'transparent', color: '#dc2626',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  opacity: finalize.isPending ? 0.6 : 1,
                }}
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('APPROVED')}
                disabled={finalize.isPending}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: '#15803d', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  opacity: finalize.isPending ? 0.6 : 1,
                }}
              >
                {finalize.isPending ? 'Processing…' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function ApprovalsPage() {
  const navigate = useNavigate();

  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<TrainingApprovalStatus | ''>('');
  const [dialogTarget, setTarget]   = useState<TrainingPlanApproval | null>(null);

  const params: TrainingApprovalListParams = {
    approval_status: statusFilter || undefined,
    search:          search || undefined,
    page,
    page_size:       PAGE_SIZE,
  };

  const { data, isLoading, error } = useTrainingApprovals(params);
  const approvals = data?.results ?? [];
  const total     = data?.count   ?? 0;

  const activeFilters: [string, string][] = [
    ...(statusFilter ? [['status', statusFilter] as [string, string]] : []),
  ];

  const columns: DataTableColumn<TrainingPlanApproval>[] = [
    {
      type: 'custom',
      header: 'Plan Name',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {row.training_plan_name ?? `Plan #${row.training_plan}`}
          </p>
          {row.training_plan_department && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {row.training_plan_department}
            </p>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Year',
      width: '80px',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {row.training_plan_year ?? '—'}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Submitted By',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {row.submitted_by_name ?? '—'}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Approver',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {row.approver_name}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      width: '130px',
      render: (row) => (
        <TableCell>
          <Pill
            label={row.approval_status}
            color={STATUS_COLOR[row.approval_status] ?? '#64748b'}
            bg={STATUS_BG[row.approval_status] ?? 'var(--color-surface-alt)'}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Date',
      width: '120px',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {row.approved_at
              ? new Date(row.approved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            }
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Actions',
      width: '160px',
      render: (row) => (
        <TableActionCell>
          <TableActionButton
            variant="secondary"
            onClick={() => navigate(`/admin/training-plans/${row.training_plan}/edit`)}
          >
            View Plan
          </TableActionButton>
          {row.approval_status === 'PENDING' ? (
            <TableActionButton
              variant="primary"
              onClick={() => setTarget(row)}
            >
              Review
            </TableActionButton>
          ) : (
            <TableActionButton
              variant="secondary"
              onClick={() => setTarget(row)}
            >
              Details
            </TableActionButton>
          )}
        </TableActionCell>
      ),
    },
  ];

  return (
    <>
      <AdminMasterLayout
        title="Approvals"
        description="Review and action pending training plan approval requests."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Training' },
          { label: 'Approvals' },
        ]}
        searchPlaceholder="Search by plan name…"
        searchTerm={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        resultCount={total}
        filterSlot={
          <select
            className="form-input"
            value={statusFilter}
            onChange={e => { setStatus(e.target.value as TrainingApprovalStatus | ''); setPage(1); }}
            style={{ width: '160px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">Status: All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        }
        chips={{
          activeFilters,
          onRemove: () => { setStatus(''); setPage(1); },
          onClearAll: () => { setStatus(''); setPage(1); },
          getKeyLabel: () => 'Status',
        }}
      >
        <AdminDataTable<TrainingPlanApproval>
          rowKey="id"
          columns={columns}
          data={approvals}
          isLoading={isLoading}
          error={error}
          emptyMessage="No approval records found."
          skeletonRowCount={8}
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      </AdminMasterLayout>

      <ApprovalActionDialog
        approval={dialogTarget}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
