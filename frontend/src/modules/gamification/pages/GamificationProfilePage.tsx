import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { AdminPagination } from '@/components/ui/pagination';
import { BadgeCatalogGrid } from '../components/BadgeCatalogGrid';
import { GamificationEmptyState } from '../components/GamificationEmptyState';
import { GamificationErrorState } from '../components/GamificationErrorState';
import { StreakCards } from '../components/StreakCards';
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';
import {
  useGamificationBadgeCatalog,
  useGamificationMyBadges,
  useGamificationSummary,
  useGamificationTransactions,
} from '../hooks/useGamificationQueries';

const TX_PAGE_SIZE = 15;

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

const panelStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

export const GamificationProfilePage: React.FC = () => {
  const { isLoading: statusLoading, isEnabled } = useGamificationEnabled();
  const [txPage, setTxPage] = useState(1);

  const summaryQuery = useGamificationSummary();
  const catalogQuery = useGamificationBadgeCatalog();
  const earnedQuery = useGamificationMyBadges();
  const transactionsQuery = useGamificationTransactions({
    page: txPage,
    page_size: TX_PAGE_SIZE,
  });

  const earnedAtByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of earnedQuery.data ?? []) {
      if (b.earned_at) map[b.code] = b.earned_at;
    }
    return map;
  }, [earnedQuery.data]);

  if (statusLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 size={28} className="animate-spin text-gray-400" />
        <p className="text-gray-500 mt-4">Checking gamification status…</p>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
        <Trophy size={40} style={{ color: '#E8833A' }} strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold text-gray-900 mt-4 mb-2">Learning rewards</h1>
        <p className="text-gray-500 max-w-md">
          Gamification is not enabled for your organization yet.
        </p>
        <Link to="/profile" className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to profile
        </Link>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const transactions = transactionsQuery.data?.results ?? [];
  const txCount = transactionsQuery.data?.count ?? 0;
  const txTotalPages = Math.max(1, Math.ceil(txCount / TX_PAGE_SIZE));

  const headerLoading = summaryQuery.isLoading && !summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
      <div className="anim delay-1">
        <Link
          to="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-3)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          Back to profile
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Learning rewards</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}>
          Your XP, badges, streaks, and activity history.
        </p>
      </div>

      {headerLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : summaryQuery.isError ? (
        <GamificationErrorState onRetry={() => summaryQuery.refetch()} />
      ) : summary ? (
        <>
          <div
            className="anim delay-1"
            style={{
              ...panelStyle,
              padding: 'var(--space-5)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Lifetime XP
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#E8833A' }}>
                  {formatXp(summary.lifetime_xp)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Company rank
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {summary.pool_size > 0 ? `#${summary.rank}` : '—'}
                </div>
                {summary.pool_size > 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    of {summary.pool_size}
                  </div>
                ) : null}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Badges
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.badges_count}</div>
              </div>
            </div>
            <Link
              to="/leaderboard"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View leaderboard →
            </Link>
          </div>

          <section className="anim delay-2">
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              Streaks
            </h2>
            <StreakCards streaks={summary.streaks} />
          </section>
        </>
      ) : null}

      <section className="anim delay-2" style={panelStyle}>
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Badges
        </div>
        <div style={{ padding: 'var(--space-5)' }}>
          {catalogQuery.isLoading && !catalogQuery.data ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : catalogQuery.isError ? (
            <GamificationErrorState onRetry={() => catalogQuery.refetch()} />
          ) : catalogQuery.data?.results.length ? (
            <BadgeCatalogGrid
              badges={catalogQuery.data.results}
              earnedAtByCode={earnedAtByCode}
            />
          ) : (
            <GamificationEmptyState title="No badges configured" />
          )}
        </div>
      </section>

      <section className="anim delay-3" style={panelStyle}>
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border)',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          XP history
        </div>
        {transactionsQuery.isLoading && !transactionsQuery.data ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : transactionsQuery.isError ? (
          <div style={{ padding: 'var(--space-5)' }}>
            <GamificationErrorState onRetry={() => transactionsQuery.refetch()} />
          </div>
        ) : transactions.length === 0 ? (
          <GamificationEmptyState
            title="No XP activity yet"
            description="Complete courses and assessments to earn learning points."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
                    <th style={thStyle}>Date</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Reason</th>
                    <th style={thStyle}>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={tdStyle}>{formatDateTime(tx.created_at)}</td>
                      <td style={tdStyle}>
                        <span title={tx.rule_code}>{tx.rule_label}</span>
                        {tx.metadata && tx.metadata.backfill === true ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            (historical)
                          </span>
                        ) : null}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'center',
                          fontWeight: 600,
                          color: tx.amount >= 0 ? '#2E8B5E' : '#B45309',
                        }}
                      >
                        {tx.amount >= 0 ? '+' : ''}
                        {formatXp(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {txTotalPages > 1 ? (
              <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <AdminPagination
                  currentPage={txPage}
                  totalPages={txTotalPages}
                  totalItems={txCount}
                  pageSize={TX_PAGE_SIZE}
                  onPageChange={setTxPage}
                />
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};
