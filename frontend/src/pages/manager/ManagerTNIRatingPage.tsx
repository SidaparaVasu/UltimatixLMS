import React, { useState, useCallback, useEffect } from 'react';
import { Users, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  useTeamSubmitted,
  useManagerReviewMatrix,
  useSaveManagerRatingDraft,
  useSubmitManagerRatings,
  TNI_QUERY_KEYS,
} from '@/queries/tni/useTNIQueries';
import { useSkillLevels } from '@/queries/admin/useAdminMasters';
import { RatingStatusBanner } from '@/components/tni/RatingStatusBanner';
import { SkillGapBadge } from '@/components/tni/SkillGapBadge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { ProficiencyBadge } from '@/components/ui/proficiency-badge';
import {
  ManagerReviewRow,
  SkillLevelNested,
  ManagerRatingSubmitPayload,
  GapSeverity,
} from '@/types/tni.types';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/stores/notificationStore';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface LocalRating {
  levelId: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Gap preview — computed live as manager selects a level
// ---------------------------------------------------------------------------

function computeGapSeverity(
  selectedLevelId: number | null,
  requiredLevel: SkillLevelNested | null,
  levels: SkillLevelNested[],
): GapSeverity | null {
  if (!selectedLevelId || !requiredLevel) return null;
  const selected = levels.find(l => l.id === selectedLevelId);
  if (!selected) return null;
  const gap = requiredLevel.level_rank - selected.level_rank;
  if (gap <= 0) return 'NONE';
  if (gap === 1) return 'MINOR';
  return 'CRITICAL';
}

// ---------------------------------------------------------------------------
// Single skill row
// ---------------------------------------------------------------------------

const ReviewSkillRow: React.FC<{
  row: ManagerReviewRow;
  levels: SkillLevelNested[];
  selectedLevelId: number | null;
  onChange: (skillId: number, levelId: number) => void;
  readOnly: boolean;
  notesExpanded: boolean;
  onToggleNotes: () => void;
}> = ({ row, levels, selectedLevelId, onChange, readOnly, notesExpanded, onToggleNotes }) => {
  const gapSeverity = computeGapSeverity(selectedLevelId, row.required_level, levels);
  const hasNotes = !!(row.self_rating?.observations || row.self_rating?.accomplishments);

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 110px 1fr 90px',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: notesExpanded && hasNotes ? 'none' : '1px solid var(--color-border)',
        background: !row.is_role_skill ? 'rgba(124,58,237,0.02)' : 'transparent',
      }}>
        {/* Skill name + notes toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
          <span style={{
            fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {row.skill_name}
          </span>
          {!row.is_role_skill && (
            <span style={{
              fontSize: '10px', fontWeight: 600, color: '#7c3aed',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.20)',
              borderRadius: '4px', padding: '1px 5px', flexShrink: 0,
            }}>
              Extra
            </span>
          )}
          {hasNotes && (
            <button
              onClick={onToggleNotes}
              title={notesExpanded ? 'Hide employee notes' : 'View employee notes'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', padding: '2px', display: 'flex',
                alignItems: 'center', flexShrink: 0,
              }}
            >
              {notesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
        </div>

        {/* Required level */}
        <div>
          {row.required_level ? (
            <ProficiencyBadge level={row.required_level.level_name} rank={row.required_level.level_rank} />
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>—</span>
          )}
        </div>

        {/* Self-rated level */}
        <div>
          {row.self_rating ? (
            <ProficiencyBadge
              level={row.self_rating.rated_level.level_name}
              rank={row.self_rating.rated_level.level_rank}
            />
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Not rated</span>
          )}
        </div>

        {/* Manager assessment */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {readOnly ? (
            selectedLevelId ? (
              (() => {
                const sel = levels.find(l => l.id === selectedLevelId);
                return sel ? <ProficiencyBadge level={sel.level_name} rank={sel.level_rank} /> : null;
              })()
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Not rated</span>
            )
          ) : (
            levels.map(level => {
              const isSelected = selectedLevelId === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => onChange(row.skill_id, level.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '999px',
                    fontSize: '12px', fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer', transition: 'all 150ms',
                    border: isSelected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                    background: isSelected ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)',
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                >
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    border: isSelected ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                  }} />
                  {level.level_name}
                </button>
              );
            })
          )}
        </div>

        {/* Live gap preview */}
        <div>
          {gapSeverity ? (
            <SkillGapBadge severity={gapSeverity} compact />
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>—</span>
          )}
        </div>
      </div>

      {/* Employee notes — expandable */}
      {notesExpanded && hasNotes && (
        <div style={{
          padding: 'var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) + 20px)',
          background: 'rgba(37,99,235,0.03)',
          borderBottom: '1px solid var(--color-border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)',
        }}>
          {row.self_rating?.observations && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                Performance Hindrances
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {row.self_rating.observations}
              </p>
            </div>
          )}
          {row.self_rating?.accomplishments && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                Recent Accomplishments
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {row.self_rating.accomplishments}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Category section
// ---------------------------------------------------------------------------

const ReviewCategorySection: React.FC<{
  categoryName: string;
  rows: ManagerReviewRow[];
  levels: SkillLevelNested[];
  ratings: Record<number, LocalRating>;
  onLevelChange: (skillId: number, levelId: number) => void;
  readOnly: boolean;
}> = ({ categoryName, rows, levels, ratings, onLevelChange, readOnly }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const toggleNotes = (skillId: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(skillId) ? next.delete(skillId) : next.add(skillId);
      return next;
    });
  };

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 'var(--space-4)',
      background: 'var(--color-surface)',
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-alt)', border: 'none',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border)',
          cursor: 'pointer', textAlign: 'left', transition: 'background 150ms',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-canvas)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-alt)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {collapsed
            ? <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
            : <ChevronDown size={15} style={{ color: 'var(--color-text-muted)' }} />}
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {categoryName}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '999px', padding: '1px 8px',
          }}>
            {rows.length} skill{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 110px 1fr 90px',
            gap: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            {['Skill', 'Required', 'Self-Rated', readOnly ? 'Identified Level' : 'Your Assessment', 'Gap'].map((col, i) => (
              <span key={i} style={{
                fontSize: '10px', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
              }}>
                {col}
              </span>
            ))}
          </div>

          {rows.map(row => (
            <ReviewSkillRow
              key={row.skill_id}
              row={row}
              levels={levels}
              selectedLevelId={ratings[row.skill_id]?.levelId ?? null}
              onChange={onLevelChange}
              readOnly={readOnly}
              notesExpanded={expandedNotes.has(row.skill_id)}
              onToggleNotes={() => toggleNotes(row.skill_id)}
            />
          ))}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ManagerTNIRatingPage() {
  const showNotification = useNotificationStore(s => s.showNotification);
  const queryClient      = useQueryClient();

  const { data: teamData, isLoading: teamLoading } = useTeamSubmitted();
  const { data: levelsData } = useSkillLevels();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [ratings, setRatings]                       = useState<Record<number, LocalRating>>({});
  const [showSubmitConfirm, setShowSubmitConfirm]   = useState(false);
  const [submittedIds, setSubmittedIds]             = useState<Set<number>>(new Set());

  const saveDraftMutation = useSaveManagerRatingDraft();
  const submitMutation    = useSubmitManagerRatings();

  // Single composite API call
  const { data: reviewMatrixData, isLoading: matrixLoading } = useManagerReviewMatrix(selectedEmployeeId);

  const team         = teamData ?? [];
  const reviewRows: ManagerReviewRow[] = reviewMatrixData ?? [];
  const levels: SkillLevelNested[] = (levelsData?.results ?? []).map(l => ({
    id: l.id, level_name: l.level_name, level_rank: l.level_rank,
  }));

  // Is the manager's review already submitted for this employee?
  const isAlreadySubmitted = reviewRows.length > 0 &&
    reviewRows.every(r => r.manager_rating?.status === 'SUBMITTED');

  const submittedAt = isAlreadySubmitted
    ? reviewRows.find(r => r.manager_rating?.submitted_at)?.manager_rating?.submitted_at
    : null;

  // Seed local ratings from existing manager ratings when matrix loads
  useEffect(() => {
    if (!selectedEmployeeId || reviewRows.length === 0) return;
    const initial: Record<number, LocalRating> = {};
    reviewRows.forEach(row => {
      if (row.manager_rating) {
        initial[row.skill_id] = {
          levelId: row.manager_rating.rated_level.id,
          notes:   row.manager_rating.notes,
        };
      }
    });
    setRatings(initial);
  }, [selectedEmployeeId, reviewRows.length]);

  // Reset when employee changes
  useEffect(() => {
    setRatings({});
  }, [selectedEmployeeId]);

  const handleLevelChange = useCallback((skillId: number, levelId: number) => {
    setRatings(prev => ({
      ...prev,
      [skillId]: { ...(prev[skillId] ?? { notes: '' }), levelId },
    }));
  }, []);

  const buildPayload = (): ManagerRatingSubmitPayload => ({
    employee_id: selectedEmployeeId!,
    ratings: Object.entries(ratings).map(([skillId, r]) => ({
      skill_id: Number(skillId),
      level_id: r.levelId,
      notes:    r.notes,
    })),
  });

  const handleSaveDraft = () => {
    if (!selectedEmployeeId) return;
    saveDraftMutation.mutate(buildPayload(), {
      onSuccess: () => showNotification('Draft saved successfully.', 'success'),
    });
  };

  const handleConfirmSubmit = () => {
    if (!selectedEmployeeId) return;
    saveDraftMutation.mutate(buildPayload(), {
      onSuccess: () => {
        submitMutation.mutate(buildPayload(), {
          onSuccess: (summary) => {
            setShowSubmitConfirm(false);
            setSubmittedIds(prev => new Set([...prev, selectedEmployeeId]));
            queryClient.invalidateQueries({ queryKey: TNI_QUERY_KEYS.teamSubmitted });
            queryClient.invalidateQueries({ queryKey: TNI_QUERY_KEYS.managerReviewMatrix(selectedEmployeeId) });
            if (summary) {
              showNotification(
                `Submitted. ${summary.gaps_found} gap(s) found, ${summary.training_needs_created} training need(s) created.`,
                'success',
              );
            }
            window.location.reload();
          },
        });
      },
    });
  };

  // Group rows by category
  const categorySections = React.useMemo(() => {
    const map = new Map<string, ManagerReviewRow[]>();
    reviewRows.forEach(row => {
      const key = row.category_name ?? (row.is_role_skill ? 'Uncategorised' : 'Additional Skills');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    });
    return Array.from(map.entries()).map(([name, rows]) => ({ name, rows }));
  }, [reviewRows]);

  const employeeOptions: ComboboxOption[] = team.map(emp => ({
    value: String(emp.id),
    label: emp.full_name || emp.employee_code,
    sub:   `${emp.employee_code}${submittedIds.has(emp.id) ? ' · ✓ Reviewed' : ''}`,
  }));

  const selectedEmployee = team.find(e => e.id === selectedEmployeeId) ?? null;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (teamLoading) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{ height: '28px', width: '260px', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: 'var(--space-6)' }} className="skeleton" />
        <div style={{ height: '48px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }} className="skeleton" />
        <div style={{ height: '300px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20">
      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Team Skill Review
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Review your team's self-assessments and set identified skill levels
            </p>
          </div>
        </div>
        <div style={{ height: '1px', background: 'var(--color-border)', marginTop: 'var(--space-4)' }} />
      </div>

      {/* No direct reports with submissions */}
      {team.length === 0 ? (
        <RatingStatusBanner
          variant="info"
          message="No pending reviews."
          detail="None of your direct reports have submitted a self-assessment yet."
        />
      ) : (
        <>
          {/* Employee selector */}
          <div style={{ marginBottom: 'var(--space-5)', position: 'relative', zIndex: 20 }}>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              color: 'var(--color-text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: 'var(--space-2)',
            }}>
              Select Team Member
            </label>
            <Combobox
              options={employeeOptions}
              value={selectedEmployeeId ? [String(selectedEmployeeId)] : []}
              onChange={ids => {
                const id = ids.length > 0 ? Number(ids[ids.length - 1]) : null;
                setSelectedEmployeeId(id);
              }}
              maxItems={1}
              placeholder="Search by name or employee code…"
            />
          </div>

          {/* Review panel */}
          <div>
            {!selectedEmployeeId ? (
              <div style={{
                padding: 'var(--space-12) var(--space-8)', textAlign: 'center',
                background: 'var(--color-surface)', border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)',
              }}>
                <Users size={36} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
                <p style={{ fontSize: '14px', fontWeight: 500, margin: '7px 0' }}>Select a team member</p>
                <p style={{ fontSize: '13px', margin: 0 }}>
                  Choose an employee from the dropdown above to review their self-assessment.
                </p>
              </div>
            ) : matrixLoading ? (
              <div style={{ height: '240px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
            ) : (
              <>
                {/* Employee info bar */}
                {selectedEmployee && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {selectedEmployee.full_name || selectedEmployee.employee_code}
                          <span style={{ margin: '0 5px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                            ({selectedEmployee.employee_code}) · {selectedEmployee.email}
                          </span>
                        </p>
                      </div>
                      {submittedIds.has(selectedEmployeeId) && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 10px', borderRadius: '999px',
                          fontSize: '11px', fontWeight: 600,
                          color: '#15803d', background: 'rgba(26,158,58,0.10)',
                        }}>
                          <CheckCircle size={11} strokeWidth={2.5} />
                          Reviewed
                        </span>
                      )}
                    </div>
                    {(() => {
                      const firstSelf = reviewRows.find(r => r.self_rating?.submitted_at);
                      return firstSelf?.self_rating?.submitted_at ? (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Self-assessment submitted{' '}
                          {new Date(firstSelf.self_rating.submitted_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Already submitted banner */}
                {isAlreadySubmitted && (
                  <RatingStatusBanner
                    variant="submitted"
                    message="You have already submitted your review for this employee."
                    detail={submittedAt
                      ? `Submitted on ${new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                      : undefined}
                  />
                )}

                {/* No self-ratings */}
                {reviewRows.length === 0 && (
                  <RatingStatusBanner
                    variant="info"
                    message="This employee has not submitted a self-assessment yet."
                    detail="You can only review after the employee submits their self-rating."
                  />
                )}

                {/* Category sections */}
                {reviewRows.length > 0 && categorySections.map(section => (
                  <ReviewCategorySection
                    key={section.name}
                    categoryName={section.name}
                    rows={section.rows}
                    levels={levels}
                    ratings={ratings}
                    onLevelChange={handleLevelChange}
                    readOnly={isAlreadySubmitted}
                  />
                ))}

                {/* Action bar */}
                {reviewRows.length > 0 && !isAlreadySubmitted && (
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--color-border)',
                    marginTop: 'var(--space-2)',
                  }}>
                    <button
                      onClick={handleSaveDraft}
                      disabled={saveDraftMutation.isPending}
                      style={{
                        padding: '9px 20px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        opacity: saveDraftMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {saveDraftMutation.isPending ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      disabled={submitMutation.isPending || saveDraftMutation.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '9px 20px', borderRadius: 'var(--radius-md)',
                        border: 'none', background: 'var(--color-accent)',
                        color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        opacity: (submitMutation.isPending || saveDraftMutation.isPending) ? 0.6 : 1,
                      }}
                    >
                      <CheckCircle size={14} strokeWidth={2.5} />
                      Submit &amp; Run Gap Analysis
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <ConfirmationDialog
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Manager Review"
        description="This will finalize your identified skill levels, update the employee's skill profile, and automatically create training needs for any gaps found. This cannot be undone."
        confirmLabel="Submit & Run Gap Analysis"
        variant="primary"
        isLoading={submitMutation.isPending || saveDraftMutation.isPending}
      />
    </div>
  );
}
