import { useState } from 'react';
import { TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableActionCell, TableActionButton } from '@/components/ui/table';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useSkillUpgradeProposalList, useApproveSkillUpgrade } from '@/queries/admin/useSkillUpgradeQueries';
import { useNotificationStore } from '@/stores/notificationStore';
import { SkillUpgradeProposal } from '@/types/skill-upgrade.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const PAGE_SIZE = 20;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SkillUpgradeApprovalsPage() {
  const showNotification = useNotificationStore(s => s.showNotification);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | ''>('PENDING');
  const [confirmProposal, setConfirmProposal] = useState<SkillUpgradeProposal | null>(null);

  const { data, isLoading, error } = useSkillUpgradeProposalList({
    status: statusFilter || undefined,
    page,
  });

  const approveUpgrade = useApproveSkillUpgrade();

  const items = data?.results ?? [];
  const total = data?.count ?? 0;

  const handleApproveConfirm = () => {
    if (!confirmProposal) return;
    approveUpgrade.mutate(confirmProposal.id, {
      onSuccess: () => {
        showNotification(
          `Skill upgrade approved — ${confirmProposal.employee_name} → ${confirmProposal.skill_name} (${confirmProposal.proposed_level_name})`,
          'success',
        );
        setConfirmProposal(null);
      },
      onError: () => {
        showNotification('Failed to approve. Please try again.', 'error');
      },
    });
  };

  const columns: DataTableColumn<SkillUpgradeProposal>[] = [
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
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {row.skill_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Proposed: <strong>{row.proposed_level_name}</strong>
          </p>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Assessment',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {row.assessment_title}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Requested',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {formatDate(row.created_at)}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      render: (row) => (
        <TableCell>
          {row.status === 'APPROVED' ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '999px',
              fontSize: '11px', fontWeight: 600,
              background: 'rgba(22,163,74,0.10)', color: '#15803d',
            }}>
              <CheckCircle2 size={11} />
              Approved
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '999px',
              fontSize: '11px', fontWeight: 600,
              background: 'rgba(217,119,6,0.10)', color: '#b45309',
            }}>
              <Clock size={11} />
              Pending
            </span>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Approved By',
      render: (row) => (
        <TableCell>
          {row.approved_by_name ? (
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {row.approved_by_name}
              </p>
              {row.approved_at && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {formatDate(row.approved_at)}
                </p>
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
      header: 'Actions',
      render: (row) => (
        <TableActionCell>
          {row.status === 'PENDING' && (
            <TableActionButton
              variant="primary"
              onClick={() => setConfirmProposal(row)}
            >
              Approve
            </TableActionButton>
          )}
        </TableActionCell>
      ),
    },
  ];

  return (
    <AdminMasterLayout
      title="Skill Upgrade Approvals"
      description="Review and approve skill upgrade proposals generated when learners pass standalone assessments."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Assessments' },
        { label: 'Skill Upgrades' },
      ]}
      resultCount={total}
      filterSlot={
        <select
          className="form-input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as 'PENDING' | ''); setPage(1); }}
          style={{ width: '140px', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="PENDING">Pending</option>
          <option value="">All</option>
        </select>
      }
    >
      {total === 0 && !isLoading && !error ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-16) var(--space-8)',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-muted)',
        }}>
          <TrendingUp size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
          <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>
            {statusFilter === 'PENDING' ? 'No pending approvals' : 'No proposals found'}
          </p>
          <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
            {statusFilter === 'PENDING'
              ? 'All skill upgrade proposals have been reviewed.'
              : 'Skill upgrade proposals will appear here when learners pass assessments.'}
          </p>
        </div>
      ) : (
        <AdminDataTable<SkillUpgradeProposal>
          rowKey="id"
          columns={columns}
          data={items}
          isLoading={isLoading}
          error={error}
          emptyMessage="No proposals found."
          skeletonRowCount={6}
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      )}

      {/* Approve confirmation dialog */}
      <ConfirmationDialog
        open={!!confirmProposal}
        onClose={() => setConfirmProposal(null)}
        onConfirm={handleApproveConfirm}
        title="Approve Skill Upgrade"
        description={
          confirmProposal
            ? `This will upgrade ${confirmProposal.employee_name}'s skill level for "${confirmProposal.skill_name}" to ${confirmProposal.proposed_level_name}. This action cannot be undone.`
            : ''
        }
        confirmLabel="Approve Upgrade"
        variant="primary"
        isLoading={approveUpgrade.isPending}
      />
    </AdminMasterLayout>
  );
}
