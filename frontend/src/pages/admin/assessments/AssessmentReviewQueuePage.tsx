import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertCircle } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableActionCell, TableActionButton } from '@/components/ui/table';
import { useReviewQueue } from '@/queries/admin/useAssessmentReviewQueries';
import { ReviewQueueItem } from '@/types/assessment-review.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AssessmentReviewQueuePage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useReviewQueue({ page });
  const items  = data?.results ?? [];
  const total  = data?.count   ?? 0;

  const columns: DataTableColumn<ReviewQueueItem>[] = [
    {
      type: 'custom',
      header: 'Learner',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {row.learner_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {row.employee_code}
          </p>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Assessment',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {row.assessment_title}
          </p>
          {row.course_title && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {row.course_title}
            </p>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Submitted',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            {formatDate(row.submitted_at)}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Auto Score',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {row.auto_score.toFixed(1)}/{row.total_points.toFixed(1)}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Pending',
      render: (row) => (
        <TableCell>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: '999px',
            fontSize: '11px', fontWeight: 600,
            background: 'rgba(217,119,6,0.10)', color: '#b45309',
          }}>
            <AlertCircle size={11} />
            {row.pending_count} Q
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Actions',
      render: (row) => (
        <TableActionCell>
          <TableActionButton
            variant="primary"
            onClick={() => navigate(`/admin/assessments/review/${row.id}`)}
          >
            Review
          </TableActionButton>
        </TableActionCell>
      ),
    },
  ];

  return (
    <AdminMasterLayout
      title="Assessment Review"
      description="Manually grade pending assessment submissions that contain descriptive or file-upload questions."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Assessments' },
        { label: 'Review Queue' },
      ]}
      resultCount={total}
    >
      {total === 0 && !isLoading && !error ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-16) var(--space-8)',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-muted)',
        }}>
          <ClipboardCheck size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
          <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>All caught up</p>
          <p style={{ fontSize: '13px', margin: '4px 0 0' }}>No assessments are pending manual review.</p>
        </div>
      ) : (
        <AdminDataTable<ReviewQueueItem>
          rowKey="id"
          columns={columns}
          data={items}
          isLoading={isLoading}
          error={error}
          emptyMessage="No pending reviews."
          skeletonRowCount={8}
          pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        />
      )}
    </AdminMasterLayout>
  );
}
