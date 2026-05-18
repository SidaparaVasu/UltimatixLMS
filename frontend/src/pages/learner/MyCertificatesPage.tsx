import React, { useState, useEffect } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import { CertificateCard } from '@/components/certificates/CertificateCard';
import { CertificateSkeletonCard } from '@/components/certificates/CertificateSkeletonCard';
import { AdminPagination } from '@/components/ui/pagination';
import { useMyCertificates } from '@/queries/learner/useMyCertificatesQueries';
import { certificateApi } from '@/api/certificate-api';
import { useNotificationStore } from '@/stores/notificationStore';
import { checkRenewalNotifications } from '@/utils/certificateNotifications';
import { CertificateRecord } from '@/types/certificate.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type StatusFilter = '' | 'active' | 'expired';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyCertificatesPage() {
  const { showNotification } = useNotificationStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // ── Data ──
  const { data, isLoading, isError, refetch } = useMyCertificates({
    status: statusFilter || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const certificates: CertificateRecord[] = (data as any)?.results ?? [];
  const total: number = (data as any)?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Renewal notifications — run once after data loads ──
  useEffect(() => {
    if (certificates.length > 0) {
      checkRenewalNotifications(certificates, showNotification);
    }
  }, [certificates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Download handler ──
  const handleDownload = async (id: number) => {
    setDownloadingId(id);
    try {
      const blob = await certificateApi.downloadCertificate(id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      showNotification('Failed to download certificate. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Filter tab change ──
  const handleFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 'var(--space-6, 24px)', maxWidth: '1200px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          {/* <Award size={22} style={{ color: 'var(--color-accent)' }} /> */}
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            My Certificates
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
          View, download, and share your earned certificates.
        </p>
      </div>

      {/* ── Status filter tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '24px',
        }}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                marginBottom: '-1px',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading state — skeleton grid ── */}
      {isLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <CertificateSkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {isError && !isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 32px',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-muted)',
            gap: '12px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--color-danger, #dc2626)' }}>
            Failed to load certificates.
          </p>
          <button
            onClick={() => refetch()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !isError && certificates.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 32px',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-muted)',
            gap: '8px',
          }}
        >
          <Award size={36} style={{ opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
            {statusFilter
              ? 'No certificates match the selected filter.'
              : "You haven't earned any certificates yet."}
          </p>
          {!statusFilter && (
            <p style={{ margin: 0, fontSize: '13px' }}>
              Complete a course or pass an assessment to earn your first certificate.
            </p>
          )}
        </div>
      )}

      {/* ── Certificate card grid ── */}
      {!isLoading && !isError && certificates.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {certificates.map((cert) => (
              <CertificateCard
                key={cert.id}
                certificate={cert}
                onDownload={handleDownload}
                isDownloading={downloadingId === cert.id}
              />
            ))}
          </div>

          {/* ── Pagination ── */}
          {total > PAGE_SIZE && (
            <AdminPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
