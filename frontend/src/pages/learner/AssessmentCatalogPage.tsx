import React from 'react';
import { ClipboardList } from 'lucide-react';
import { useAssessmentCatalog } from '@/queries/learner/useAssessmentCatalogQueries';
import AssessmentCatalogCard from '@/components/learner/assessment/AssessmentCatalogCard';
import { CatalogItem } from '@/types/assessment-catalog.types';

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{ padding: 'var(--space-4)' }}>
        <div style={{ height: '16px', width: '75%', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: 'var(--space-2)' }} className="skeleton" />
        <div style={{ height: '12px', width: '90%', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: '4px' }} className="skeleton" />
        <div style={{ height: '12px', width: '60%', background: 'var(--color-surface-alt)', borderRadius: '6px' }} className="skeleton" />
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '6px' }}>
        <div style={{ height: '20px', width: '80px', background: 'var(--color-surface-alt)', borderRadius: '999px' }} className="skeleton" />
        <div style={{ height: '20px', width: '70px', background: 'var(--color-surface-alt)', borderRadius: '999px' }} className="skeleton" />
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '40px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }} className="skeleton" />
        ))}
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <div style={{ height: '36px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }} className="skeleton" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentCatalogPage() {
  const { data, isLoading, error } = useAssessmentCatalog();

  const items = data?.results ?? [];

  const handleStart = (item: CatalogItem) => {
    // Open player WITHOUT creating an attempt — let the instructions screen handle that
    const url = `/assessments/${item.id}/attempt`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleResume = (item: CatalogItem) => {
    if (!item.active_attempt_id) return;
    const url = `/assessments/${item.id}/attempt?attempt=${item.active_attempt_id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ padding: 'var(--space-6) 0' }}>
      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          Skill Assessments
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Test your skills and earn recognition for your expertise.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-danger)', fontSize: '14px' }}>
          Failed to load assessments. Please refresh the page.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && items.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-16) var(--space-8)',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-muted)',
        }}>
          <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
          <p style={{ fontSize: '15px', fontWeight: 500, margin: 0 }}>No assessments available</p>
          <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
            Check back later — new assessments will appear here when published.
          </p>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !error && items.length > 0 && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            {items.length} assessment{items.length !== 1 ? 's' : ''} available
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {items.map(item => (
              <AssessmentCatalogCard
                key={item.id}
                item={item}
                onStart={handleStart}
                onResume={handleResume}
                isStarting={false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
