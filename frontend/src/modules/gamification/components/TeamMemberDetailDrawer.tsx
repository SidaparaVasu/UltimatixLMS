import { Loader2 } from 'lucide-react';
import { Drawer } from '@/components/ui/drawer';
import { BadgeCatalogGrid } from './BadgeCatalogGrid';
import { GamificationErrorState } from './GamificationErrorState';
import { StreakCards } from './StreakCards';
import { useGamificationTeamMember } from '../hooks/useGamificationQueries';
import type { TeamGamificationMember } from '../types';

function formatXp(value: number) {
  return value.toLocaleString();
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: 12 }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-muted)',
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{children}</div>
  </div>
);

interface TeamMemberDetailDrawerProps {
  member: TeamGamificationMember | null;
  open: boolean;
  onClose: () => void;
}

export const TeamMemberDetailDrawer: React.FC<TeamMemberDetailDrawerProps> = ({
  member,
  open,
  onClose,
}) => {
  const detailQuery = useGamificationTeamMember(member?.employee_id ?? null);
  const detail = detailQuery.data;

  const earnedBadges =
    detail?.badges.map((b) => ({ ...b, is_earned: true })) ?? [];
  const earnedAtByCode = Object.fromEntries(
    (detail?.badges ?? [])
      .filter((b) => b.earned_at)
      .map((b) => [b.code, b.earned_at!]),
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      position="right"
      size="520px"
      title={member?.display_name ?? 'Team member'}
      description={
        member
          ? `${member.employee_code} · ${member.department_name || '—'}`
          : undefined
      }
    >
      {!member ? null : detailQuery.isLoading && !detail ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : detailQuery.isError ? (
        <GamificationErrorState
          message="Could not load this employee's gamification details."
          onRetry={() => detailQuery.refetch()}
        />
      ) : detail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Lifetime XP</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{formatXp(detail.lifetime_xp)}</div>
            </div>
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Company rank</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                #{detail.rank}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: 'var(--color-text-muted)',
                    marginLeft: 6,
                  }}
                >
                  of {detail.pool_size}
                </span>
              </div>
            </div>
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Badges</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{detail.badges_count}</div>
            </div>
          </div>

          <DetailRow label="Designation">{detail.designation_name || '—'}</DetailRow>

          <div>
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                marginBottom: 'var(--space-3)',
              }}
            >
              Streaks
            </h3>
            <StreakCards streaks={detail.streaks} />
          </div>

          {earnedBadges.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-3)',
                }}
              >
                Earned badges
              </h3>
              <BadgeCatalogGrid badges={earnedBadges} earnedAtByCode={earnedAtByCode} />
            </div>
          )}

          {detail.recent_transactions.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-3)',
                }}
              >
                Recent XP activity
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {detail.recent_transactions.map((tx) => (
                  <li
                    key={tx.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{tx.rule_label}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {formatDateTime(tx.created_at)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: tx.amount >= 0 ? '#15803d' : '#b91c1c',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {tx.amount} XP
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
};
