import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Clock, CheckCircle2, Archive,
  BookOpen, Timer, Target, Pencil, Shuffle, Database,
} from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminPagination } from '@/components/ui/pagination';
import { useStandaloneAssessmentList } from '@/queries/admin/useStandaloneAssessmentQueries';
import { StandaloneAssessmentListItem } from '@/types/standalone-assessment.types';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:     { label: 'Draft',     color: '#64748b', bg: 'var(--color-surface-alt)',    icon: Clock },
  PUBLISHED: { label: 'Published', color: '#15803d', bg: 'rgba(22,163,74,0.10)',        icon: CheckCircle2 },
  ARCHIVED:  { label: 'Archived',  color: '#475569', bg: 'rgba(100,116,139,0.10)',      icon: Archive },
};

const STATUS_ACCENT: Record<string, string> = {
  DRAFT:     'var(--color-border)',
  PUBLISHED: '#16a34a',
  ARCHIVED:  '#94a3b8',
};

const MODE_CONFIG = {
  DYNAMIC:  { label: 'System Picked', icon: Shuffle,   color: '#6d28d9', bg: 'rgba(124,58,237,0.08)' },
  CURATED:  { label: 'Curated',       icon: Database,  color: '#1d4ed8', bg: 'rgba(37,99,235,0.08)'  },
  FIXED:    { label: 'Fixed',         icon: BookOpen,  color: '#64748b', bg: 'var(--color-surface-alt)' },
};

const PAGE_SIZE = 12;

// ── Assessment Card ───────────────────────────────────────────────────────────

const AssessmentCard: React.FC<{
  item: StandaloneAssessmentListItem;
  onEdit: (id: number) => void;
}> = ({ item, onEdit }) => {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;
  const accent = STATUS_ACCENT[item.status] ?? 'var(--color-border)';

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 150ms, transform 150ms',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}
    >
      {/* Card header */}
      <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          {/* Status + mode badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 9px', borderRadius: 'var(--radius-full)',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
              background: cfg.bg, color: cfg.color,
              flexShrink: 0,
            }}>
              <StatusIcon size={10} />
              {cfg.label}
            </span>
            {(() => {
              const modeCfg = MODE_CONFIG[item.question_selection_mode] ?? MODE_CONFIG.DYNAMIC;
              const ModeIcon = modeCfg.icon;
              return (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '2px 9px', borderRadius: 'var(--radius-full)',
                  fontSize: '10px', fontWeight: 600,
                  background: modeCfg.bg, color: modeCfg.color,
                  flexShrink: 0,
                }}>
                  <ModeIcon size={10} />
                  {modeCfg.label}
                </span>
              );
            })()}
          </div>

          {/* Edit button */}
          <button
            onClick={() => onEdit(item.id)}
            title="Edit assessment"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 150ms', flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
            }}
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 var(--space-1)',
          fontSize: '14px', fontWeight: 700,
          color: 'var(--color-text-primary)', lineHeight: 1.4,
        }}>
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p style={{
            margin: 0, fontSize: '12px',
            color: 'var(--color-text-muted)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.description}
          </p>
        )}
      </div>

      {/* Skill tags */}
      {item.skill_mappings && item.skill_mappings.length > 0 && (
        <div style={{
          padding: '0 var(--space-4) var(--space-3)',
          display: 'flex', flexWrap: 'wrap', gap: '4px',
        }}>
          {item.skill_mappings.slice(0, 3).map((m, i) => (
            <span key={i} style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '10px', fontWeight: 600,
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
            }}>
              {m.skill_name} · {m.skill_level_name}
            </span>
          ))}
          {item.skill_mappings.length > 3 && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '10px', fontWeight: 500,
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text-muted)',
            }}>
              +{item.skill_mappings.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{
        marginTop: 'auto',
        padding: 'var(--space-3) var(--space-4)',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-2)',
      }}>
        <StatPill icon={<BookOpen size={11} />} label="Questions" value={String(item.number_of_questions)} />
        <StatPill icon={<Timer size={11} />} label="Duration" value={`${item.duration_minutes}m`} />
        <StatPill icon={<Target size={11} />} label="Pass" value={`${parseFloat(item.passing_percentage)}%`} />
      </div>

      {/* Created date */}
      <div style={{
        padding: 'var(--space-2) var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        fontSize: '11px', color: 'var(--color-text-muted)',
        background: 'var(--color-bg)',
      }}>
        Created {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────

const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 'var(--space-2)', borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
      {icon}
      <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
    </div>
    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
      {value}
    </span>
  </div>
);

// ── Skeleton card ─────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div style={{
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderTop: '3px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  }}>
    <div style={{ padding: 'var(--space-4)' }}>
      <div style={{ height: '20px', width: '70px', borderRadius: '999px', background: 'var(--color-surface-alt)', marginBottom: 'var(--space-3)' }} className="skeleton" />
      <div style={{ height: '16px', width: '80%', borderRadius: '6px', background: 'var(--color-surface-alt)', marginBottom: 'var(--space-2)' }} className="skeleton" />
      <div style={{ height: '12px', width: '60%', borderRadius: '6px', background: 'var(--color-surface-alt)' }} className="skeleton" />
    </div>
    <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-alt)' }} className="skeleton" />
      ))}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error } = useStandaloneAssessmentList({ page, page_size: PAGE_SIZE });

  const items = data?.results ?? [];
  const total = data?.count ?? 0;

  // Client-side filter
  const filtered = items.filter(a => {
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminMasterLayout
      title="Assessments"
      description="Manage standalone skill assessments available to learners."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Assessments' },
      ]}
      searchPlaceholder="Search assessments..."
      searchTerm={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      resultCount={total}
      addAction={
        <button
          onClick={() => navigate('/admin/assessments/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            border: 'none', background: 'var(--color-accent)', color: '#fff',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} />
          Create Assessment
        </button>
      }
      filterSlot={
        <select
          className="form-input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: '140px', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="">Status: All</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      }
    >
      {/* Loading skeletons */}
      {isLoading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-danger)', fontSize: '14px' }}>
          Failed to load assessments. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filtered.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-16) var(--space-8)',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-muted)',
        }}>
          <BookOpen size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
          <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No assessments found</p>
          <p style={{ fontSize: '13px', margin: '4px 0 var(--space-4)' }}>
            {search || statusFilter ? 'Try adjusting your filters.' : 'Create your first standalone assessment to get started.'}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => navigate('/admin/assessments/new')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--color-accent)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Create Assessment
            </button>
          )}
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !error && filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
        }}>
          {filtered.map(item => (
            <AssessmentCard
              key={item.id}
              item={item}
              onEdit={id => navigate(`/admin/assessments/${id}/edit`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <AdminPagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={p => {
            setPage(p);
            document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </AdminMasterLayout>
  );
}
