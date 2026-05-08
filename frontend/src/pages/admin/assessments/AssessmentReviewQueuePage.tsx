import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Clock, AlertCircle, BookOpen, Layers } from 'lucide-react';
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

type TabKey = 'course' | 'standalone';

const PAGE_SIZE = 20;

// ── Shared table columns ──────────────────────────────────────────────────────

function buildColumns(
  navigate: ReturnType<typeof useNavigate>,
  tab: TabKey,
): DataTableColumn<ReviewQueueItem>[] {
  return [
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
          {tab === 'course' && row.course_title && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {row.course_title}
            </p>
          )}
          {tab === 'standalone' && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-accent)', fontWeight: 500 }}>
              Standalone
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
}

// ── Tab panel ─────────────────────────────────────────────────────────────────

function ReviewTabPanel({ tab, navigate }: { tab: TabKey; navigate: ReturnType<typeof useNavigate> }) {
  const [page, setPage] = useState(1);

  const standalone = tab === 'standalone' ? 'true' : 'false';
  const { data, isLoading, error } = useReviewQueue({ standalone, page });

  const items = data?.results ?? [];
  const total = data?.count ?? 0;
  const columns = buildColumns(navigate, tab);

  if (total === 0 && !isLoading && !error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-16) var(--space-8)',
        border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
        color: 'var(--color-text-muted)',
      }}>
        <ClipboardCheck size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
        <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>All caught up</p>
        <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
          No {tab === 'standalone' ? 'standalone' : 'course'} assessments are pending manual review.
        </p>
      </div>
    );
  }

  return (
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
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentReviewQueuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state persisted in URL: ?tab=course (default) | ?tab=standalone
  const activeTab = (searchParams.get('tab') as TabKey) ?? 'course';

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab }, { replace: true });
  };

  const tabs: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
    { key: 'course',     label: 'Course Assessments',     icon: BookOpen },
    { key: 'standalone', label: 'Standalone Assessments', icon: Layers },
  ];

  return (
    <AdminMasterLayout
      title="Assessment Review"
      description="Manually grade pending assessment submissions that contain descriptive questions."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Assessments' },
        { label: 'Review Queue' },
      ]}
    >
      {/* ── Tab switcher ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-5)',
        gap: 'var(--space-1)',
      }}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'all 150ms',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content — each mounts independently with its own page state ── */}
      {activeTab === 'course' && (
        <ReviewTabPanel key="course" tab="course" navigate={navigate} />
      )}
      {activeTab === 'standalone' && (
        <ReviewTabPanel key="standalone" tab="standalone" navigate={navigate} />
      )}
    </AdminMasterLayout>
  );
}
