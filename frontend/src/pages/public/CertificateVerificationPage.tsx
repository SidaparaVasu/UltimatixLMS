import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Loader2,
  Award,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  WifiOff,
  Ban,
} from 'lucide-react';
import { certificateApi } from '@/api/certificate-api';
import { CertificateVerificationResult } from '@/types/certificate.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function isValidShape(data: unknown): data is CertificateVerificationResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.certificate_id === 'string' &&
    typeof d.learner_name === 'string' &&
    typeof d.course_or_assessment_name === 'string' &&
    typeof d.completion_date === 'string' &&
    typeof d.status === 'string' &&
    typeof d.issued_by === 'string'
  );
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    icon: CheckCircle2,
    heading: 'Certificate verified',
    headingColor: '#166534',
    iconColor: '#16a34a',
    iconBg: '#dcfce7',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    badgeLabel: 'Active',
    BadgeIcon: Check,
  },
  expired: {
    icon: AlertTriangle,
    heading: 'Certificate expired',
    headingColor: '#92400e',
    iconColor: '#d97706',
    iconBg: '#fef3c7',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    badgeLabel: 'Expired',
    BadgeIcon: AlertTriangle,
  },
  revoked: {
    icon: XCircle,
    heading: 'Certificate revoked',
    headingColor: '#991b1b',
    iconColor: '#dc2626',
    iconBg: '#fee2e2',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
    badgeLabel: 'Revoked',
    BadgeIcon: Ban,
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
  valueStyle?: React.CSSProperties;
}> = ({ label, value, valueStyle }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '16px',
      padding: '11px 0',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}
  >
    <span style={{ fontSize: '13px', color: '#64748b', flexShrink: 0 }}>
      {label}
    </span>
    <span
      style={{
        fontSize: '13px',
        color: '#1e293b',
        fontWeight: 500,
        textAlign: 'right',
        ...valueStyle,
      }}
    >
      {value}
    </span>
  </div>
);

const StatusBadge: React.FC<{
  bg: string;
  color: string;
  label: string;
  Icon: React.ElementType;
}> = ({ bg, color, label, Icon }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: '99px',
      fontSize: '12px',
      fontWeight: 500,
      background: bg,
      color,
    }}
  >
    <Icon size={11} />
    {label}
  </span>
);

// ── CertIdPill ────────────────────────────────────────────────────────────────

const CertIdPill: React.FC<{ certId: string }> = ({ certId }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(certId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [certId]);

  return (
    <button
      onClick={handleCopy}
      title="Click to copy certificate ID"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#94a3b8',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1';
        (e.currentTarget as HTMLButtonElement).style.color = '#475569';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
        (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : certId}
    </button>
  );
};

// ── LearnerCard ───────────────────────────────────────────────────────────────

const LearnerCard: React.FC<{
  name: string;
  courseName: string;
  avatarBg: string;
  avatarColor: string;
}> = ({ name, courseName, avatarBg, avatarColor }) => (
  <div
    style={{
      margin: '0 28px',
      padding: '14px 16px',
      borderRadius: '12px',
      background: '#f8fafc',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: avatarBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 600,
        color: avatarColor,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
        {name}
      </p>
      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{courseName}</p>
    </div>
  </div>
);

// ── Footer ────────────────────────────────────────────────────────────────────

const CardFooter: React.FC<{ certId?: string; showShare?: boolean }> = ({
  certId,
  showShare = false,
}) => {
  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'Certificate Verification', url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }, []);

  return (
    <div
      style={{
        borderTop: '1px solid #f1f5f9',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '12px',
          color: '#94a3b8',
        }}
      >
        <ShieldCheck size={13} />
        Verified by Ultimatix LMS
      </div>
      {showShare && (
        <button
          onClick={handleShare}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          <Share2 size={13} />
          Share
        </button>
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CertificateVerificationPage() {
  const { certificateId } = useParams<{ certificateId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public', 'certificate-verify', certificateId],
    queryFn: () => certificateApi.verifyCertificate(certificateId!),
    enabled: !!certificateId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '70vw',
    overflow: 'hidden',
    border: '1px solid #f1f5f9',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        fontFamily:
          "'DM Sans', 'Instrument Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Branding */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          <Award size={18} style={{ color: '#64748b' }} />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#475569',
              letterSpacing: '0.01em',
            }}
          >
            Ultimatix LMS
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Certificate verification portal
        </span>
      </div>

      {/* Card */}
      <div style={cardStyle}>
        {/* ── Loading ── */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '72px 32px',
              gap: '16px',
            }}
          >
            <Loader2
              size={28}
              style={{
                color: '#94a3b8',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
              Verifying certificate…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Network error ── */}
        {isError && !isLoading && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '52px 32px 32px',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WifiOff size={26} style={{ color: '#dc2626' }} />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                Verification failed
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: 1.7,
                  maxWidth: '300px',
                }}
              >
                Unable to reach the verification service. Check your connection
                and try again.
              </p>
              <button
                onClick={() => refetch()}
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
            <CardFooter />
          </>
        )}

        {/* ── Data states ── */}
        {!isLoading &&
          !isError &&
          (() => {
            // Not found
            if (!data || !isValidShape(data)) {
              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '52px 32px 32px',
                      gap: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HelpCircle size={26} style={{ color: '#94a3b8' }} />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#1e293b',
                      }}
                    >
                      Certificate not found
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#64748b',
                        lineHeight: 1.7,
                        maxWidth: '320px',
                      }}
                    >
                      We couldn't find a certificate matching this ID. It may be
                      invalid, misspelled, or has been removed.
                    </p>
                    {certificateId && (
                      <CertIdPill certId={certificateId} />
                    )}
                  </div>
                  <CardFooter />
                </>
              );
            }

            const result = data as CertificateVerificationResult;
            const status = result.status as keyof typeof STATUS_CONFIG;
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.revoked;
            const Icon = cfg.icon;
            const isRevoked = status === 'revoked';
            const isExpired = status === 'expired';

            // Avatar color based on status
            const avatarBg =
              status === 'active'
                ? '#dbeafe'
                : status === 'expired'
                ? '#fef3c7'
                : '#fee2e2';
            const avatarColor =
              status === 'active'
                ? '#1e40af'
                : status === 'expired'
                ? '#92400e'
                : '#991b1b';

            return (
              <>
                {/* Status band */}
                <div
                  style={{
                    padding: '32px 28px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    background: cfg.iconBg + '30', // very light tint
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: cfg.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={28} style={{ color: cfg.iconColor }} />
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '20px',
                      fontWeight: 700,
                      color: cfg.headingColor,
                    }}
                  >
                    {cfg.heading}
                  </h2>
                  <CertIdPill certId={result.certificate_id} />
                </div>

                {/* Learner identity block */}
                {!isRevoked && (
                  <div style={{ padding: '20px 0 0' }}>
                    <LearnerCard
                      name={result.learner_name}
                      courseName={result.course_or_assessment_name}
                      avatarBg={avatarBg}
                      avatarColor={avatarColor}
                    />
                  </div>
                )}

                {/* Details */}
                {!isRevoked && (
                  <>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '20px 28px 10px',
                      }}
                    >
                      Details
                    </div>
                    <div style={{ padding: '0 28px 24px' }}>
                      <DetailRow
                        label="Course / assessment"
                        value={result.course_or_assessment_name}
                      />
                      <DetailRow
                        label="Completion date"
                        value={formatDate(result.completion_date)}
                      />
                      <DetailRow
                        label="Expiry date"
                        value={
                          result.expiry_date
                            ? formatDate(result.expiry_date)
                            : 'No expiry'
                        }
                        valueStyle={
                          isExpired ? { color: '#d97706', fontWeight: 700 } : undefined
                        }
                      />
                      <DetailRow label="Issued by" value={result.issued_by} />
                      <DetailRow
                        label="Status"
                        value={
                          <StatusBadge
                            bg={cfg.badgeBg}
                            color={cfg.badgeColor}
                            label={cfg.badgeLabel}
                            Icon={cfg.BadgeIcon}
                          />
                        }
                      />
                    </div>
                  </>
                )}

                {/* Revoked message */}
                {isRevoked && (
                  <div
                    style={{
                      padding: '28px 32px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#64748b',
                        lineHeight: 1.7,
                        maxWidth: '340px',
                      }}
                    >
                      This certificate has been revoked and is no longer valid.
                      Contact{' '}
                      <a
                        href="mailto:support@ultimatix.com"
                        style={{ color: '#1e293b', fontWeight: 500 }}
                      >
                        support@ultimatix.com
                      </a>{' '}
                      if you believe this is an error.
                    </p>
                    <StatusBadge
                      bg={cfg.badgeBg}
                      color={cfg.badgeColor}
                      label={cfg.badgeLabel}
                      Icon={cfg.BadgeIcon}
                    />
                  </div>
                )}

                <CardFooter showShare={!isRevoked} />
              </>
            );
          })()}
      </div>
    </div>
  );
}