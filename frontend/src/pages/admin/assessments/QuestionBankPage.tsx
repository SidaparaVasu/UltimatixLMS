import React, { useState } from 'react';
import { HelpCircle, UploadCloud, Download, Plus } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell, TableStatusBadge } from '@/components/ui/table';
import { QuestionFormDrawer } from '@/components/admin/assessments/QuestionFormDrawer';
import { BulkUploadModal } from '@/components/admin/assessments/BulkUploadModal';
import { useQuestionBankList } from '@/queries/admin/useQuestionBankQueries';
import { useSkills, useSkillLevels } from '@/queries/admin/useAdminMasters';
import { QuestionBankItem, StandaloneQuestionType } from '@/types/question-bank.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<StandaloneQuestionType, string> = {
  MCQ:         'MCQ',
  MSQ:         'Multi-Select',
  TRUE_FALSE:  'True/False',
  DESCRIPTIVE: 'Descriptive',
  SCENARIO:    'Scenario',
};

const QUESTION_TYPE_COLORS: Record<StandaloneQuestionType, string> = {
  MCQ:         'var(--color-accent)',
  MSQ:         '#8b5cf6',
  TRUE_FALSE:  '#10b981',
  DESCRIPTIVE: '#f59e0b',
  SCENARIO:    '#06b6d4',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const PAGE_SIZE = 20;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Fetch questions
  const { data, isLoading, error } = useQuestionBankList({
    search: search || undefined,
    question_type: (typeFilter as StandaloneQuestionType) || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter === 'true',
    page,
  });

  // Fetch skills and levels for the form drawer
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

  // ── Column definitions ────────────────────────────────────────────────────

  const columns: DataTableColumn<QuestionBankItem>[] = [
    {
      type: 'custom',
      header: 'Question',
      render: (row) => (
        <TableCell>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
            {row.question_text.length > 90
              ? `${row.question_text.slice(0, 90)}…`
              : row.question_text}
          </p>
          {row.scenario_text && (
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Scenario: {row.scenario_text.slice(0, 50)}…
            </p>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Type',
      render: (row) => (
        <TableCell>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: 'var(--radius-full)',
            fontSize: '11px', fontWeight: 600,
            background: `color-mix(in srgb, ${QUESTION_TYPE_COLORS[row.question_type as StandaloneQuestionType] ?? 'var(--color-accent)'} 12%, transparent)`,
            color: QUESTION_TYPE_COLORS[row.question_type as StandaloneQuestionType] ?? 'var(--color-accent)',
          }}>
            {QUESTION_TYPE_LABELS[row.question_type as StandaloneQuestionType] ?? row.question_type}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Skill',
      render: (row) => (
        <TableCell>
          {row.skill_name ? (
            <>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {row.skill_name}
              </p>
              {row.skill_level_name && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {row.skill_level_name}
                </p>
              )}
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>—</span>
          )}
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Difficulty',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {row.difficulty_complexity} — {DIFFICULTY_LABELS[row.difficulty_complexity] ?? ''}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Status',
      render: (row) => (
        <TableCell>
          <TableStatusBadge variant={row.is_active ? 'active' : 'inactive'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </TableStatusBadge>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Added By',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {row.created_by_name ?? '—'}
          </span>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Date',
      width: '110px',
      render: (row) => (
        <TableCell>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </TableCell>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

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
      <AdminDataTable<QuestionBankItem>
        rowKey="id"
        columns={columns}
        data={items}
        isLoading={isLoading}
        error={error}
        emptyMessage="No questions found. Add your first question or use bulk upload."
        skeletonRowCount={8}
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
      />

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
