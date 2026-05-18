import React, { useState } from 'react';
import { Download, Share2, Award, CheckCircle, Clock, XCircle } from 'lucide-react';
import { CertificateRecord } from '@/types/certificate.types';
import { CertificateTypeBadge } from './CertificateTypeBadge';

interface CertificateCardProps {
  certificate: CertificateRecord;
  onDownload: (id: number) => void;
  isDownloading: boolean;
}

/**
 * Production-quality certificate card.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │ [icon]  Course / Assessment Name   [type]│
 *   │         Status badge                     │
 *   ├─────────────────────────────────────────┤
 *   │ Issued: DD MMM YYYY  │  Validity: ...   │
 *   ├─────────────────────────────────────────┤
 *   │ [Download ▼]              [Share ⎘]     │
 *   └─────────────────────────────────────────┘
 */
export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  onDownload,
  isDownloading,
}) => {
  const [copied, setCopied] = useState(false);

  // ── Derived status ──────────────────────────────────────────────────────────
  const getDisplayStatus = (): 'active' | 'expired' | 'expiring_soon' | 'revoked' => {
    if (certificate.is_revoked) return 'revoked';
    if (certificate.status === 'expired') return 'expired';
    if (certificate.expiry_date) {
      const msUntilExpiry = new Date(certificate.expiry_date).getTime() - Date.now();
      if (msUntilExpiry <= 30 * 24 * 60 * 60 * 1000) return 'expiring_soon';
    }
    return 'active';
  };

  const displayStatus = getDisplayStatus();

  // ── Status config ───────────────────────────────────────────────────────────
  const statusConfig = {
    active:        { label: 'Active',         color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
    expiring_soon: { label: 'Expiring Soon',  color: '#d97706', bg: '#fffbeb', icon: Clock },
    expired:       { label: 'Expired',        color: '#dc2626', bg: '#fef2f2', icon: XCircle },
    revoked:       { label: 'Revoked',        color: '#6b7280', bg: '#f9fafb', icon: XCircle },
  }[displayStatus];

  const StatusIcon = statusConfig.icon;

  // ── Date formatting ─────────────────────────────────────────────────────────
  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  const validityText = certificate.expiry_date
    ? `Expires ${formatDate(certificate.expiry_date)}`
    : 'Lifetime validity';

  // ── Share handler — full URL ────────────────────────────────────────────────
  const handleShare = async () => {
    // verification_url is a relative path like /verify/certificate/{uuid}
    // prepend origin so the copied link works outside the app
    const fullUrl = `${window.location.origin}${certificate.verification_url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // Fallback for browsers that block clipboard API
      const input = document.createElement('input');
      input.value = fullUrl;
      input.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isRevoked = certificate.is_revoked;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isRevoked ? 'var(--color-border)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: isRevoked ? 0.65 : 1,
        transition: 'box-shadow 0.15s',
      }}
    >

      {/* ── Card body ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

        {/* Row 1: Icon + Name + Type badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div
            style={{
              flexShrink: 0,
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: isRevoked ? '#f3f4f6' : '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={18} style={{ color: isRevoked ? '#9ca3af' : '#1e3a5f' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  lineHeight: '1.35',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
                title={certificate.course_or_assessment_name}
              >
                {certificate.course_or_assessment_name}
              </h3>
              <CertificateTypeBadge type={certificate.certificate_type} style={{ flexShrink: 0, marginTop: '1px' }} />
            </div>

            {/* Status badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '6px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: statusConfig.bg,
                fontSize: '11px',
                fontWeight: 600,
                color: statusConfig.color,
              }}
            >
              <StatusIcon size={11} />
              {statusConfig.label}
            </div>
          </div>
        </div>

        {/* Row 2: Metadata */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '10px 12px',
            background: 'var(--color-surface-muted, #f8fafc)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Issued
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {formatDate(certificate.issued_at)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Validity
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: displayStatus === 'expiring_soon'
                  ? '#d97706'
                  : displayStatus === 'expired'
                  ? '#dc2626'
                  : 'var(--color-text-secondary)',
              }}
            >
              {validityText}
            </div>
          </div>
        </div>

        {/* Row 3: Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <button
            onClick={() => onDownload(certificate.id)}
            disabled={isDownloading || isRevoked}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: isDownloading || isRevoked
                ? 'var(--color-surface-muted, #f8fafc)'
                : 'var(--color-surface)',
              color: isDownloading || isRevoked
                ? 'var(--color-text-muted)'
                : 'var(--color-text-primary)',
              cursor: isDownloading || isRevoked ? 'not-allowed' : 'pointer',
              opacity: isRevoked ? 0.5 : 1,
              transition: 'background 0.15s',
            }}
            aria-label="Download certificate PDF"
          >
            <Download size={13} />
            {isDownloading ? 'Downloading…' : 'Download'}
          </button>

          <button
            onClick={handleShare}
            disabled={isRevoked}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${copied ? '#86efac' : 'var(--color-border)'}`,
              background: copied
                ? '#f0fdf4'
                : 'var(--color-surface)',
              color: copied ? '#16a34a' : 'var(--color-text-primary)',
              cursor: isRevoked ? 'not-allowed' : 'pointer',
              opacity: isRevoked ? 0.5 : 1,
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
            aria-label="Copy verification link"
          >
            <Share2 size={13} />
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};
