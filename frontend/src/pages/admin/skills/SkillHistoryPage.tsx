import React, { useState, useMemo } from 'react';
import {
  History, Trophy, User, Users, Settings,
  ArrowRight, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Plus,
} from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton';
import { AdminPagination } from '@/components/ui/pagination';
import { useSkillHistoryList } from '@/queries/admin/useSkillHistoryQueries';
import { SkillHistoryEntry, SkillChangeReason } from '@/types/skill-history.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20; // employees per page

const REASON_CONFIG: Record<SkillChangeReason, {
  label: string;
  icon: React.ElementType;
  bg: string;
  color: string;
}> = {
  ASSESSMENT_AUTO:     { label: 'Assessment (Auto)',     icon: Trophy,   bg: 'rgba(37,99,235,0.08)',  color: '#1d4ed8' },
  ASSESSMENT_APPROVED: { label: 'Assessment (Approved)', icon: Trophy,   bg: 'rgba(37,99,235,0.08)',  color: '#1d4ed8' },
  MANAGER_RATING:      { label: 'Manager Rating',        icon: Users,    bg: 'rgba(124,58,237,0.08)', color: '#6d28d9' },
  SELF_RATING:         { label: 'Self Rating',           icon: User,     bg: 'rgba(107,114,128,0.1)', color: '#4b5563' },
  ADMIN_OVERRIDE:      { label: 'Admin Override',        icon: Settings, bg: 'rgba(217,119,6,0.08)',  color: '#b45309' },
};

const REASON_OPTIONS = [
  { value: '',                    label: 'All reasons' },
  { value: 'ASSESSMENT_AUTO',     label: 'Assessment (Auto)' },
  { value: 'ASSESSMENT_APPROVED', label: 'Assessment (Approved)' },
  { value: 'MANAGER_RATING',      label: 'Manager Rating' },
  { value: 'SELF_RATING',         label: 'Self Rating' },
  { value: 'ADMIN_OVERRIDE',      label: 'Admin Override' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

// ── Grouped data structure ────────────────────────────────────────────────────

interface SkillGroup {
  skillId: number;
  skillName: string;
  entries: SkillHistoryEntry[]; // sorted newest first
}

interface EmployeeGroup {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  skills: SkillGroup[];
  totalChanges: number;
  lastChangedAt: string;
  reasonCounts: Partial<Record<SkillChangeReason, number>>;
}

function groupEntries(entries: SkillHistoryEntry[]): EmployeeGroup[] {
  const empMap = new Map<number, EmployeeGroup>();

  for (const entry of entries) {
    let emp = empMap.get(entry.employee);
    if (!emp) {
      emp = {
        employeeId:   entry.employee,
        employeeName: entry.employee_name,
        employeeCode: entry.employee_code,
        skills:       [],
        totalChanges: 0,
        lastChangedAt: entry.changed_at,
        reasonCounts: {},
      };
      empMap.set(entry.employee, emp);
    }

    // Track last change date
    if (entry.changed_at > emp.lastChangedAt) emp.lastChangedAt = entry.changed_at;

    // Reason counts
    emp.reasonCounts[entry.change_reason] = (emp.reasonCounts[entry.change_reason] ?? 0) + 1;
    emp.totalChanges++;

    // Skill group
    let skillGroup = emp.skills.find(s => s.skillId === entry.skill);
    if (!skillGroup) {
      skillGroup = { skillId: entry.skill, skillName: entry.skill_name, entries: [] };
      emp.skills.push(skillGroup);
    }
    skillGroup.entries.push(entry);
  }

  // Sort entries within each skill newest-first
  for (const emp of empMap.values()) {
    for (const sg of emp.skills) {
      sg.entries.sort((a, b) => b.changed_at.localeCompare(a.changed_at));
    }
    // Sort skills by most recent change
    emp.skills.sort((a, b) =>
      b.entries[0].changed_at.localeCompare(a.entries[0].changed_at)
    );
  }

  // Sort employees by most recent change
  return Array.from(empMap.values()).sort((a, b) =>
    b.lastChangedAt.localeCompare(a.lastChangedAt)
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReasonBadge({ reason, compact = false }: { reason: SkillChangeReason; compact?: boolean }) {
  const cfg = REASON_CONFIG[reason] ?? REASON_CONFIG.ADMIN_OVERRIDE;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: compact ? '2px 7px' : '3px 9px',
      borderRadius: '999px',
      fontSize: compact ? '10px' : '11px',
      fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={compact ? 10 : 11} />
      {compact ? cfg.label.split(' ')[0] : cfg.label}
    </span>
  );
}

function LevelChangePill({ entry }: { entry: SkillHistoryEntry }) {
  const isNew     = entry.old_level === null;
  const isUpgrade = (entry.new_level_rank ?? 0) > (entry.old_level_rank ?? 0);

  if (isNew) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', borderRadius: '999px',
        background: 'rgba(22,163,74,0.08)', color: '#15803d',
        fontSize: '11px', fontWeight: 700,
      }}>
        <Plus size={10} />
        {entry.new_level_name ?? '—'}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
      <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
        {entry.old_level_name ?? '—'}
      </span>
      {isUpgrade
        ? <TrendingUp size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
        : <TrendingDown size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
      }
      <span style={{ fontWeight: 700, color: isUpgrade ? '#15803d' : '#dc2626' }}>
        {entry.new_level_name ?? '—'}
      </span>
    </span>
  );
}

// ── Skill sub-row ─────────────────────────────────────────────────────────────

function SkillSubRow({ group }: { group: SkillGroup }) {
  const [showAll, setShowAll] = useState(false);
  const latest  = group.entries[0];
  const hasMore = group.entries.length > 1;
  const visible = showAll ? group.entries : [latest];

  return (
    <div style={{
      borderBottom: '1px solid var(--color-border)',
    }}>
      {visible.map((entry, idx) => (
        <div
          key={entry.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 160px 140px 120px',
            gap: '12px',
            alignItems: 'center',
            padding: '10px 16px 10px 48px',
            background: idx % 2 === 0 ? 'var(--color-bg)' : 'transparent',
          }}
        >
          {/* Skill name — only on first row */}
          <div>
            {idx === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {group.skillName}
                </span>
                {hasMore && (
                  <button
                    onClick={() => setShowAll(v => !v)}
                    style={{
                      padding: '1px 6px', borderRadius: '999px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-alt)',
                      color: 'var(--color-text-muted)',
                      fontSize: '10px', fontWeight: 600,
                      cursor: 'pointer', lineHeight: 1.4,
                    }}
                  >
                    {showAll ? 'less' : `+${group.entries.length - 1} more`}
                  </button>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', paddingLeft: '4px' }}>↳</span>
            )}
          </div>

          {/* Level change */}
          <div><LevelChangePill entry={entry} /></div>

          {/* Reason */}
          <div><ReasonBadge reason={entry.change_reason} /></div>

          {/* Changed by */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {entry.changed_by_name ?? (
                <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>System</span>
              )}
            </span>
          </div>

          {/* Date */}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {formatDateTime(entry.changed_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Employee row (collapsible) ────────────────────────────────────────────────

function EmployeeRow({ group }: { group: EmployeeGroup }) {
  const [expanded, setExpanded] = useState(false);

  // Top 3 distinct reasons for the summary pills
  const topReasons = Object.entries(group.reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason]) => reason as SkillChangeReason);

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {/* ── Collapsed header row ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: '36px 220px 1fr auto 120px',
          gap: '12px',
          alignItems: 'center',
          padding: '14px 16px',
          border: 'none',
          background: expanded
            ? 'color-mix(in srgb, var(--color-accent) 4%, var(--color-surface))'
            : 'var(--color-surface)',
          cursor: 'pointer',
          transition: 'background 150ms',
          borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
        }}
      >
        {/* Chevron */}
        <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
          {expanded
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
        </span>

        {/* Employee identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)',
          }}>
            {getInitials(group.employeeName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {group.employeeName}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {group.employeeCode}
            </p>
          </div>
        </div>

        {/* Reason summary pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {topReasons.map(r => (
            <ReasonBadge key={r} reason={r} compact />
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
              {group.skills.length}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Skills
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
              {group.totalChanges}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Changes
            </p>
          </div>
        </div>

        {/* Last change date */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>Last change</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {formatDate(group.lastChangedAt)}
          </p>
        </div>
      </button>

      {/* ── Expanded: skill sub-rows ── */}
      {expanded && (
        <div>
          {/* Sub-header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 160px 140px 120px',
            gap: '12px',
            padding: '6px 16px 6px 48px',
            background: 'var(--color-surface-alt)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            {['Skill', 'Level Change', 'Reason', 'Changed By', 'Date'].map(h => (
              <span key={h} style={{
                fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}>
                {h}
              </span>
            ))}
          </div>

          {group.skills.map(sg => (
            <SkillSubRow key={sg.skillId} group={sg} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SkillHistoryPage() {
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  // Fetch a larger batch since we group client-side
  const { data, isLoading, error } = useSkillHistoryList({
    page: 1,
    page_size: 200, // fetch enough to group meaningfully
    ...(reasonFilter ? { change_reason: reasonFilter as SkillChangeReason } : {}),
  });

  const allEntries = data?.results ?? [];

  // Group flat entries → employee groups
  const allGroups = useMemo(() => groupEntries(allEntries), [allEntries]);

  // Client-side search on employee name/code/skill name
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map(emp => {
        // Check if employee matches
        const empMatch =
          emp.employeeName.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q);

        if (empMatch) return emp;

        // Check if any skill matches — return employee with only matching skills
        const matchingSkills = emp.skills.filter(s =>
          s.skillName.toLowerCase().includes(q)
        );
        if (matchingSkills.length === 0) return null;

        return {
          ...emp,
          skills: matchingSkills,
          totalChanges: matchingSkills.reduce((sum, s) => sum + s.entries.length, 0),
        };
      })
      .filter(Boolean) as EmployeeGroup[];
  }, [allGroups, search]);

  // Client-side pagination over employee groups
  const totalEmployees = filteredGroups.length;
  const pagedGroups    = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminMasterLayout
      title="Skill History"
      description="Audit log of all employee skill level changes across your organisation."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Skill History' },
      ]}
      resultCount={totalEmployees}
      searchTerm={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      searchPlaceholder="Search by employee or skill..."
      filterSlot={
        <select
          className="form-input"
          value={reasonFilter}
          onChange={e => { setReasonFilter(e.target.value); setPage(1); }}
          style={{ width: '180px', cursor: 'pointer', flexShrink: 0 }}
        >
          {REASON_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      }
    >
      <div style={{ paddingBottom: '40px' }}>
        {/* Loading */}
        {isLoading && (
          <AdminTableSkeleton rowCount={5} columnCount={5} showActionCol={false} />
        )}

        {/* Error */}
        {error && !isLoading && (
          <div style={{
            padding: 'var(--space-8)', textAlign: 'center',
            color: 'var(--color-danger)', fontSize: '14px',
          }}>
            Failed to load skill history. Please refresh the page.
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredGroups.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-16) var(--space-8)',
            border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-muted)',
          }}>
            <History size={36} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No skill history found</p>
            <p style={{ fontSize: '13px', margin: '4px 0 0' }}>
              Skill level changes will appear here as employees complete assessments and ratings.
            </p>
          </div>
        )}

        {/* Employee groups */}
        {!isLoading && !error && pagedGroups.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {pagedGroups.map(group => (
                <EmployeeRow key={group.employeeId} group={group} />
              ))}
            </div>

            {totalEmployees > PAGE_SIZE && (
              <AdminPagination
                currentPage={page}
                totalPages={Math.ceil(totalEmployees / PAGE_SIZE)}
                totalItems={totalEmployees}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </AdminMasterLayout>
  );
}
