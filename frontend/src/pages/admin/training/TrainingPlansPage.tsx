import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableActionCell, TableActionButton } from '@/components/ui/table';
import { useDepartmentOptions } from '@/queries/admin/useAdminMasters';
import {
  useTrainingPlans,
  useFinalizeApproval,
  TRAINING_QUERY_KEYS,
} from '@/queries/training/useTrainingQueries';
import { trainingApi } from '@/api/training-api';
import { TrainingPlan, TrainingPlanStatus, TrainingPlanListParams } from '@/types/training.types';

// ── Status badge config ────────────────────────────────────────────────────

const STATUS_COLOR: Record<TrainingPlanStatus, string> = {
  DRAFT:            '#64748b',
  PENDING_APPROVAL: 'var(--color-warning)',
  APPROVED:         'var(--color-success)',
  ACTIVE:           'var(--color-accent)',
  COMPLETED:        '#94a3b8',
};
const STATUS_BG: Record<TrainingPlanStatus, string> = {
  DRAFT:            'var(--color-surface-alt)',
  PENDING_APPROVAL: 'rgba(217,119,6,0.10)',
  APPROVED:         'rgba(21,128,61,0.10)',
  ACTIVE:           'rgba(37,99,235,0.10)',
  COMPLETED:        'var(--color-surface-alt)',
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

// ── Plan Approval Dialog ───────────────────────────────────────────────────

interface PlanApprovalDialogProps {
  plan: TrainingPlan | null;
  onClose: () => void;
}

const PlanApprovalDialog: React.FC<PlanApprovalDialogProps> = ({ plan, onClose }) => {
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const finalize = useFinalizeApproval();
  const qc = useQueryClient();

  if (!plan) return null;

  const handleAction = (status: 'APPROVED' | 'REJECTED') => {
    if (!comments.trim()) {
      setError('Comments are required.');
      return;
    }
    finalize.mutate(
      { id: plan.id, payload: { status, comments: comments.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['training', 'plans'] });
          onClose();
        },
      }
    );
  };

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
        width: '480px',
        maxWidth: '95vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Review Training Plan
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {plan.plan_name} · {plan.department_name} · {plan.year}
        </p>

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
            style={{ width: '100%', resize: 'vertical', height: '80px', padding: '10px' }}
          />
          {error && (
            <span style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>
              {error}
            </span>
          )}
        </div>

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
            Cancel
          </button>
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
              border: 'none',
              background: '#15803d', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              opacity: finalize.isPending ? 0.6 : 1,
            }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function TrainingPlansPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrainingPlanStatus | ''>('');
  const [approvalTarget, setApprovalTarget] = useState<TrainingPlan | null>(null);

  const { data: deptOptions } = useDepartmentOptions();

  const params: TrainingPlanListParams = {
    year:      yearFilter ? Number(yearFilter) : undefined,
    department: deptFilter ? Number(deptFilter) : undefined,
    status:    statusFilter || undefined,
    search:    search || undefined,
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading, error } = useTrainingPlans(params);
  const plans = data?.results ?? [];
  const total = data?.count ?? 0;

  const submitMutation = useMutation({
    mutationFn: (id: number) =>
      trainingApi.updatePlan(id, { status: 'PENDING_APPROVAL' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'plans'] }),
  });

  const activeFilters: [string, string][] = [
    ...(yearFilter   ? [['year',   yearFilter]   as [string, string]] : []),
    ...(deptFilter   ? [['dept',   deptFilter]   as [string, string]] : []),
    ...(statusFilter ? [['status', statusFilter] as [string, string]] : []),
  ];

  const handleRemoveFilter = (key: string) => {
    if (key === 'year')   setYearFilter('');
    if (key === 'dept')   setDeptFilter('');
    if (key === 'status') setStatusFilter('');
    setPage(1);
  };

  const columns: DataTableColumn<TrainingPlan>[] = [
    {
      type: 'custom',
      header: 'Plan Name',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {row.plan_name}
          </p>
          {row.training_category && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {row.training_category}
            </p>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Year',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {row.year}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Department',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {row.department_name}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Plan Items',
      render: (row) => (
        <TableCell>
          {row.items_count ?? 0}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <TableCell>
          <Pill
            label={row.status.replace('_', ' ')}
            color={STATUS_COLOR[row.status] ?? 'var(--color-text-muted)'}
            bg={STATUS_BG[row.status] ?? 'var(--color-surface-alt)'}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Actions',
      render: (row) => (
        <TableActionCell>
          <TableActionButton
            variant="secondary"
            onClick={() => navigate(`/admin/training-plans/${row.id}/edit`)}
            style={{ marginRight: '6px' }}
          >
            Edit
          </TableActionButton>
          {row.status === 'DRAFT' && (
            <TableActionButton
              variant="primary"
              onClick={() => submitMutation.mutate(row.id)}
              style={{ marginRight: '6px' }}
            >
              Submit
            </TableActionButton>
          )}
          {row.status === 'PENDING_APPROVAL' && (
            <TableActionButton
              variant="primary"
              onClick={() => setApprovalTarget(row)}
            >
              Review
            </TableActionButton>
          )}
        </TableActionCell>
      ),
    },
  ];

  return (
    <>
      <AdminMasterLayout
        title="Training Plans"
        description="Create and manage annual training plans for your departments."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Training Plans' },
        ]}
        addLabel="New Plan"
        onAdd={() => navigate('/admin/training-plans/new')}
        searchPlaceholder="Search plans…"
        searchTerm={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        resultCount={total}
        filterSlot={
          <>
            <input
              type="number"
              className="form-input"
              placeholder="Year"
              value={yearFilter}
              onChange={e => { setYearFilter(e.target.value); setPage(1); }}
              style={{ width: '100px', flexShrink: 0 }}
              min={2020}
            />
            <select
              className="form-input"
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
              style={{ width: '160px', cursor: 'pointer', flexShrink: 0 }}
            >
              <option value="">Department: All</option>
              {(deptOptions ?? []).map(d => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
            <select
              className="form-input"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as TrainingPlanStatus | ''); setPage(1); }}
              style={{ width: '160px', cursor: 'pointer', flexShrink: 0 }}
            >
              <option value="">Status: All</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </>
        }
        chips={{
          activeFilters,
          onRemove: handleRemoveFilter,
          onClearAll: () => {
            setYearFilter('');
            setDeptFilter('');
            setStatusFilter('');
            setPage(1);
          },
          getKeyLabel: (k) => ({ year: 'Year', dept: 'Department', status: 'Status' }[k] ?? k),
        }}
      >
        <AdminDataTable<TrainingPlan>
          rowKey="id"
          columns={columns}
          data={plans}
          isLoading={isLoading}
          error={error}
          emptyMessage="No training plans found."
          skeletonRowCount={8}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
        />
      </AdminMasterLayout>

      <PlanApprovalDialog
        plan={approvalTarget}
        onClose={() => setApprovalTarget(null)}
      />
    </>
  );
}
