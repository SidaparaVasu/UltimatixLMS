import React, { useState, useRef, useEffect } from 'react';
import { Award } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableActionCell } from '@/components/ui/table';
import { CertificateTypeBadge } from '@/components/certificates/CertificateTypeBadge';
import { CertificateStatusBadge } from '@/components/certificates/CertificateStatusBadge';
import { RevokeDialog } from '@/components/certificates/RevokeDialog';
import {
  useAdminCertificates,
  useRevokeCertificate,
} from '@/queries/admin/useCertificateQueries';
import { useNotificationStore } from '@/stores/notificationStore';
import { CertificateAdminRecord } from '@/types/certificate.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CertificateManagementPage() {
  const { showNotification } = useNotificationStore();

  // ── Filter state ──
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Dialog state ──
  const [revokeTarget, setRevokeTarget] = useState<CertificateAdminRecord | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // ── Debounce search ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_MS);
  };
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Data ──
  const { data, isLoading, error, refetch } = useAdminCertificates({
    learner_name: debouncedSearch || undefined,
    certificate_type: typeFilter || undefined,
    status: statusFilter || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const revokeMutation = useRevokeCertificate();

  const items: CertificateAdminRecord[] = (data as any)?.results ?? [];
  const total: number = (data as any)?.count ?? 0;

  // ── Revoke handlers ──
  const handleRevokeConfirm = async (reason: string) => {
    if (!revokeTarget) return;
    setRevokeError(null);
    try {
      await revokeMutation.mutateAsync({ id: revokeTarget.id, payload: { reason } });
      setRevokeTarget(null);
      showNotification('Certificate revoked successfully.', 'success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.detail ??
        err?.message ??
        'Failed to revoke certificate.';
      setRevokeError(msg);
    }
  };

  // ── Table columns ──
  const columns: DataTableColumn<CertificateAdminRecord>[] = [
    {
      type: 'custom',
      header: 'Learner',
      render: (row) => (
        <TableCell>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              display: 'block',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.learner_name}
          >
            {row.learner_name}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Course / Assessment',
      render: (row) => (
        <TableCell>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              display: 'block',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.course_or_assessment_name}
          >
            {row.course_or_assessment_name}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Type',
      render: (row) => (
        <TableCell>
          <CertificateTypeBadge type={row.certificate_type} />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Issued',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {formatDate(row.issued_at)}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Expiry',
      render: (row) => (
        <TableCell>
          <span
            style={{
              fontSize: '12px',
              color: row.expiry_date ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
              fontStyle: row.expiry_date ? 'normal' : 'italic',
            }}
          >
            {formatDate(row.expiry_date)}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      render: (row) => (
        <TableCell>
          {row.is_revoked ? (
            <CertificateStatusBadge status="revoked" />
          ) : (
            <CertificateStatusBadge status={row.status} />
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Actions',
      render: (row) => (
        <TableActionCell>
          {!row.is_revoked && (
            <button
              onClick={() => {
                setRevokeError(null);
                setRevokeTarget(row);
              }}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-danger, #dc2626)',
                background: 'white',
                color: 'var(--color-danger, #dc2626)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Revoke
            </button>
          )}
        </TableActionCell>
      ),
    },
  ];

  return (
    <AdminMasterLayout
      title="Certificates"
      description="View and manage all issued certificates across learners."
      // icon={Award}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Certificates' },
      ]}
      searchPlaceholder="Search by learner name…"
      searchTerm={search}
      onSearchChange={handleSearchChange}
      resultCount={total}
      filterSlot={
        <>
          <select
            className="form-input"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ width: '150px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">Type: All</option>
            <option value="course">Course</option>
            <option value="assessment">Assessment</option>
          </select>
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: '150px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">Status: All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </>
      }
    >
      {/* Error state with retry */}
      {error && !isLoading && (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            color: 'var(--color-danger)',
            fontSize: '14px',
          }}
        >
          Failed to load certificates.{' '}
          <button
            onClick={() => refetch()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <AdminDataTable<CertificateAdminRecord>
          rowKey="id"
          columns={columns}
          data={items}
          isLoading={isLoading}
          emptyMessage={
            debouncedSearch || typeFilter || statusFilter
              ? 'No certificates match the current filters.'
              : 'No certificates have been issued yet.'
          }
          skeletonRowCount={8}
          pagination={
            total > PAGE_SIZE
              ? { page, pageSize: PAGE_SIZE, total, onPageChange: setPage }
              : undefined
          }
        />
      )}

      {/* Revoke dialog */}
      <RevokeDialog
        open={!!revokeTarget}
        onClose={() => {
          setRevokeTarget(null);
          setRevokeError(null);
        }}
        onConfirm={handleRevokeConfirm}
        isLoading={revokeMutation.isPending}
        error={revokeError}
      />
    </AdminMasterLayout>
  );
}
