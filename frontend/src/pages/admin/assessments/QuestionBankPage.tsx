import React, { useState } from 'react';
import { UploadCloud, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminPagination } from '@/components/ui/pagination';
import { TableStatusBadge } from '@/components/ui/table';
import { QuestionFormDrawer } from '@/components/admin/assessments/QuestionFormDrawer';
import { BulkUploadModal } from '@/components/admin/assessments/BulkUploadModal';
import { useQuestionBankList } from '@/queries/admin/useQuestionBankQueries';
import { useSkills, useSkillLevels } from '@/queries/admin/useAdminMasters';
import { QuestionBankItem, StandaloneQuestionType, QuestionOption } from '@/types/question-bank.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ:         'MCQ',
  MSQ:         'Multi-Select',
  TRUE_FALSE:  'True/False',
  DESCRIPTIVE: 'Descriptive',
  SCENARIO:    'Scenario',
};

const QUESTION_TYPE_COLORS: Record<string, string> = {
  MCQ:         'var(--color-accent)',
  MSQ:         '#8b5cf6',
  TRUE_FALSE:  '#10b981',
  DESCRIPTIVE: '#f59e0b',
  SCENARIO:    '#06b6d4',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy', 2: 'Basic', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert',
};

const PAGE_SIZE = 20;

// ── Expandable Question Row ───────────────────────────────────────────────────

const QuestionRow: React.FC<{ item: QuestionBankItem; index: number }> = ({ item, index }) => {
  const [expanded, setExpanded] = useState(false);
  const typeColor = QUESTION_TYPE_COLORS[item.question_type] ?? 'var(--color-accent)';
  const hasOptions = item.options && item.options.length > 0;

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      transition: 'box-shadow 150ms',
    }}>
      {/* ── Collapsed header row — always visible ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {/* Index */}
        <span style={{
          flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
          background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '11px', fontWeight: 700,
          color: 'var(--color-text-muted)',
        }}>
          {index + 1}
        </span>

        {/* Type badge */}
        <span style={{
          flexShrink: 0,
          padding: '2px 9px', borderRadius: 'var(--radius-full)',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
          background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
          color: typeColor,
        }}>
          {QUESTION_TYPE_LABELS[item.question_type] ?? item.question_type}
        </span>

        {/* Question text preview */}
        <span style={{
          flex: 1, fontSize: '13px', fontWeight: 500,
          color: 'var(--color-text-primary)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.question_text}
        </span>

        {/* Skill tag */}
        {item.skill_name && (
          <span style={{
            flexShrink: 0, fontSize: '11px', fontWeight: 500,
            color: 'var(--color-text-muted)',
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            whiteSpace: 'nowrap',
          }}>
            {item.skill_name}
            {item.skill_level_name && ` · ${item.skill_level_name}`}
          </span>
        )}

        {/* Difficulty */}
        <span style={{
          flexShrink: 0, fontSize: '11px', color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
        }}>
          L{item.difficulty_complexity}
        </span>

        {/* Status dot */}
        <span style={{
          flexShrink: 0, width: '7px', height: '7px', borderRadius: '50%',
          background: item.is_active ? '#16a34a' : 'var(--color-text-muted)',
        }} title={item.is_active ? 'Active' : 'Inactive'} />

        {/* Expand chevron */}
        {expanded
          ? <ChevronUp size={15} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
          : <ChevronDown size={15} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
        }
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          padding: 'var(--space-4) var(--space-5)',
        }}>
          {/* Scenario block */}
          {item.scenario_text && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface)',
              borderLeft: `3px solid ${typeColor}`,
              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
              marginBottom: 'var(--space-4)',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Scenario
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {item.scenario_text}
              </p>
            </div>
          )}

          {/* Full question text */}
          <p style={{ margin: '0 0 var(--space-4)', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {item.question_text}
          </p>

          {/* Options */}
          {hasOptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              {item.options.map((opt: QuestionOption, i: number) => (
                <div key={opt.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${opt.is_correct ? 'rgba(22,163,74,0.3)' : 'var(--color-border)'}`,
                  background: opt.is_correct ? 'rgba(22,163,74,0.06)' : 'var(--color-surface)',
                }}>
                  {opt.is_correct
                    ? <CheckCircle2 size={14} style={{ flexShrink: 0, color: '#16a34a' }} />
                    : <XCircle size={14} style={{ flexShrink: 0, color: 'var(--color-border)' }} />
                  }
                  <span style={{
                    fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)', flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: opt.is_correct ? '#15803d' : 'var(--color-text-secondary)',
                    fontWeight: opt.is_correct ? 500 : 400,
                  }}>
                    {opt.option_text}
                  </span>
                  {opt.is_correct && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '10px', fontWeight: 700,
                      color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Explanation */}
          {item.explanation_text && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)',
            }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)' }}>
                Explanation
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {item.explanation_text}
              </p>
            </div>
          )}

          {/* Metadata footer */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border)',
            fontSize: '12px', color: 'var(--color-text-muted)',
          }}>
            {item.skill_name && (
              <span>Skill: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.skill_name}</strong></span>
            )}
            {item.skill_level_name && (
              <span>Level: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.skill_level_name}</strong></span>
            )}
            <span>Difficulty: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.difficulty_complexity} — {DIFFICULTY_LABELS[item.difficulty_complexity]}</strong></span>
            <span>Status: <strong style={{ color: item.is_active ? '#16a34a' : 'var(--color-text-muted)' }}>{item.is_active ? 'Active' : 'Inactive'}</strong></span>
            {item.created_by_name && (
              <span>Added by: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.created_by_name}</strong></span>
            )}
            <span style={{ marginLeft: 'auto' }}>
              {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <div style={{
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface)',
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-surface-alt)' }} className="skeleton" />
    <div style={{ width: '70px', height: '20px', borderRadius: '999px', background: 'var(--color-surface-alt)' }} className="skeleton" />
    <div style={{ flex: 1, height: '14px', borderRadius: '6px', background: 'var(--color-surface-alt)' }} className="skeleton" />
    <div style={{ width: '80px', height: '20px', borderRadius: '999px', background: 'var(--color-surface-alt)' }} className="skeleton" />
    <div style={{ width: '20px', height: '14px', borderRadius: '4px', background: 'var(--color-surface-alt)' }} className="skeleton" />
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const { data, isLoading, error } = useQuestionBankList({
    search: search || undefined,
    question_type: (typeFilter as StandaloneQuestionType) || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter === 'true',
    page,
  });

  const { data: skillsRes } = useSkills();
  const { data: levelsRes } = useSkillLevels();

  const skills = (skillsRes?.results ?? []).map((s: any) => ({
    value: String(s.id),
    label: s.skill_name,
  }));
  const skillLevels = (levelsRes?.results ?? []).map((l: any) => ({
    value: String(l.id),
    label: l.level_name,
  }));

  const items = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <AdminMasterLayout
      title="Question Bank"
      description="Manage the global pool of questions used by standalone assessments."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Assessments' },
        { label: 'Question Bank' },
      ]}
      searchPlaceholder="Search questions..."
      searchTerm={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      resultCount={total}
      addAction={
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setBulkUploadOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <UploadCloud size={15} />
            Bulk Upload
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: 'none', background: 'var(--color-accent)', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            Add Question
          </button>
        </div>
      }
      filterSlot={
        <>
          <select
            className="form-input"
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ width: '150px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">Type: All</option>
            <option value="MCQ">MCQ</option>
            <option value="MSQ">Multi-Select</option>
            <option value="TRUE_FALSE">True/False</option>
            <option value="DESCRIPTIVE">Descriptive</option>
            <option value="SCENARIO">Scenario</option>
          </select>
          <select
            className="form-input"
            value={activeFilter}
            onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
            style={{ width: '130px', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">Status: All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </>
      }
    >
      {/* ── Question list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

        {isLoading && (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        )}

        {error && (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-danger)', fontSize: '14px' }}>
            Failed to load questions. Please try again.
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-16) var(--space-8)',
            border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-muted)',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No questions found</p>
            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
              {search ? 'Try a different search term.' : 'Add your first question or use bulk upload.'}
            </p>
          </div>
        )}

        {!isLoading && items.map((item, i) => (
          <QuestionRow
            key={item.id}
            item={item}
            index={(page - 1) * PAGE_SIZE + i}
          />
        ))}
      </div>

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <AdminPagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Add Question Drawer */}
      <QuestionFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        skills={skills}
        skillLevels={skillLevels}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
      />
    </AdminMasterLayout>
  );
}
