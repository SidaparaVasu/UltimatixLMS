import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, X, ArrowRight } from 'lucide-react';
import { useSkillRatings, useSaveSelfRatingDraft, useSubmitSelfRatings } from '@/queries/tni/useTNIQueries';
import { useSkillLevels, useSkills } from '@/queries/admin/useAdminMasters';
import { SkillCategorySection, SkillRowData } from '@/components/tni/SkillCategorySection';
import { RatingStatusBanner } from '@/components/tni/RatingStatusBanner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { ProficiencyBadge } from '@/components/ui/proficiency-badge';
import { SkillMatrixRow, SkillLevelNested, SelfRatingBulkSavePayload } from '@/types/tni.types';
import { tniApi } from '@/api/tni-api';
import { useQuery } from '@tanstack/react-query';
import { TNI_QUERY_KEYS } from '@/queries/tni/useTNIQueries';
import { useNotificationStore } from '@/stores/notificationStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocalRating {
  levelId: number;
  observations: string;
  accomplishments: string;
  dirty: boolean; // has unsaved changes
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SelfTNIRatingPage() {
  const showNotification = useNotificationStore(s => s.showNotification);

  // ── Server data ──────────────────────────────────────────────────────────
  const { data: matrixData, isLoading: matrixLoading } = useQuery({
    queryKey: TNI_QUERY_KEYS.mySkillMatrix,
    queryFn:  tniApi.getMySkillMatrix,
  });

  const { data: existingRatingsData, isLoading: ratingsLoading } = useSkillRatings({
    rating_type: 'SELF',
  });

  const { data: levelsData } = useSkillLevels();
  const { data: allSkillsData } = useSkills();

  const saveDraftMutation    = useSaveSelfRatingDraft();
  const submitMutation       = useSubmitSelfRatings();

  // ── Local state ──────────────────────────────────────────────────────────
  // Map of skillId → local rating state (controlled form)
  const [ratings, setRatings] = useState<Record<number, LocalRating>>({});
  // Extra skills added by the employee (not in job role)
  const [extraSkillIds, setExtraSkillIds] = useState<number[]>([]);
  // Shared notes (observations + accomplishments apply to the whole submission)
  const [observations, setObservations]       = useState('');
  const [accomplishments, setAccomplishments] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [missingSkillIds, setMissingSkillIds]     = useState<number[]>([]);

  // Auto-save debounce ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived data ─────────────────────────────────────────────────────────
  const matrix: SkillMatrixRow[] = matrixData ?? [];
  const levels: SkillLevelNested[] = (levelsData?.results ?? []).map(l => ({
    id: l.id,
    level_name: l.level_name,
    level_rank: l.level_rank,
  }));
  const allSkills = allSkillsData?.results ?? [];
  const existingRatings = existingRatingsData?.results ?? [];

  // Is the whole self-rating already submitted?
  const isSubmitted = existingRatings.length > 0 &&
    existingRatings.every(r => r.status === 'SUBMITTED');

  // Submitted timestamp (from first submitted rating)
  const submittedAt = isSubmitted
    ? existingRatings.find(r => r.submitted_at)?.submitted_at
    : null;

  // ── Seed local state from server data ────────────────────────────────────
  useEffect(() => {
    if (existingRatings.length === 0) return;
    const initial: Record<number, LocalRating> = {};
    existingRatings.forEach(r => {
      initial[r.skill] = {
        levelId:        r.rated_level,
        observations:   r.observations,
        accomplishments: r.accomplishments,
        dirty:          false,
      };
    });
    setRatings(initial);

    // Seed shared notes from first SELF rating that has them
    const withObs = existingRatings.find(r => r.observations);
    if (withObs) setObservations(withObs.observations);
    const withAcc = existingRatings.find(r => r.accomplishments);
    if (withAcc) setAccomplishments(withAcc.accomplishments);

    // Seed extra skills (skills rated but not in job role matrix)
    const matrixSkillIds = new Set(matrix.map(r => r.skill_id));
    const extras = existingRatings
      .filter(r => !matrixSkillIds.has(r.skill))
      .map(r => r.skill);
    if (extras.length > 0) setExtraSkillIds(prev => [...new Set([...prev, ...extras])]);
  }, [existingRatings.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleLevelChange = useCallback((skillId: number, levelId: number) => {
    setRatings(prev => ({
      ...prev,
      [skillId]: {
        ...(prev[skillId] ?? { observations: '', accomplishments: '' }),
        levelId,
        dirty: true,
      },
    }));
    scheduleAutoSave();
  }, []);

  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      triggerAutoSave();
    }, 1500);
  };

  const triggerAutoSave = useCallback(() => {
    const dirtyEntries = Object.entries(ratings).filter(([, v]) => v.dirty);
    if (dirtyEntries.length === 0) return;

    const payload: SelfRatingBulkSavePayload = {
      ratings: dirtyEntries.map(([skillId, r]) => ({
        skill_id:       Number(skillId),
        level_id:       r.levelId,
        observations,
        accomplishments,
      })),
    };
    saveDraftMutation.mutate(payload, {
      onSuccess: () => {
        setRatings(prev => {
          const updated = { ...prev };
          dirtyEntries.forEach(([skillId]) => {
            if (updated[Number(skillId)]) {
              updated[Number(skillId)] = { ...updated[Number(skillId)], dirty: false };
            }
          });
          return updated;
        });
      },
    });
  }, [ratings, observations, accomplishments]);

  const handleSaveDraft = () => {
    const payload: SelfRatingBulkSavePayload = {
      ratings: Object.entries(ratings).map(([skillId, r]) => ({
        skill_id:       Number(skillId),
        level_id:       r.levelId,
        observations,
        accomplishments,
      })),
    };
    saveDraftMutation.mutate(payload, {
      onSuccess: () => {
        showNotification('Draft saved successfully.', 'success');
      },
    });
  };

  const handleSubmitClick = () => {
    // Validate all required skills are rated
    const requiredIds = matrix.map(r => r.skill_id);
    const missing = requiredIds.filter(id => !ratings[id]?.levelId);
    if (missing.length > 0) {
      setMissingSkillIds(missing);
      return;
    }
    setMissingSkillIds([]);
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    // Save all ratings first, then submit
    const payload: SelfRatingBulkSavePayload = {
      ratings: Object.entries(ratings).map(([skillId, r]) => ({
        skill_id:       Number(skillId),
        level_id:       r.levelId,
        observations,
        accomplishments,
      })),
    };
    saveDraftMutation.mutate(payload, {
      onSuccess: () => {
        submitMutation.mutate(undefined, {
          onSuccess: (result) => {
            setShowSubmitConfirm(false);
            if (result?.bypassed_manager_review) {
              showNotification(
                `Submitted. No reporting manager found — gap analysis ran automatically. ${result.gaps_found} gap(s) found.`,
                'info',
              );
            }
            window.location.reload();
          },
        });
      },
    });
    
  };

  const handleAddExtraSkill = (skillId: number) => {
    if (!extraSkillIds.includes(skillId)) {
      setExtraSkillIds(prev => [...prev, skillId]);
    }
  };

  const handleRemoveExtraSkill = (skillId: number) => {
    setExtraSkillIds(prev => prev.filter(id => id !== skillId));
    setRatings(prev => {
      const updated = { ...prev };
      delete updated[skillId];
      return updated;
    });
  };

  // ── Group matrix rows by category ─────────────────────────────────────────
  const categorySections = React.useMemo(() => {
    const map = new Map<string, { categoryId: number | null; skills: SkillRowData[] }>();

    matrix.forEach(row => {
      const key = row.category_name ?? 'Uncategorised';
      if (!map.has(key)) {
        map.set(key, { categoryId: row.category_id, skills: [] });
      }
      map.get(key)!.skills.push({
        skillId:        row.skill_id,
        skillName:      row.skill_name,
        requiredLevel:  row.required_level,
        selectedLevelId: ratings[row.skill_id]?.levelId ?? null,
        isMissing:      missingSkillIds.includes(row.skill_id),
      });
    });

    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [matrix, ratings, missingSkillIds]);

  // Extra skills section rows
  const extraSkillRows: SkillRowData[] = React.useMemo(() => {
    return extraSkillIds.map(skillId => {
      const skill = allSkills.find(s => s.id === skillId);
      return {
        skillId,
        skillName:       skill?.skill_name ?? `Skill #${skillId}`,
        requiredLevel:   null,
        selectedLevelId: ratings[skillId]?.levelId ?? null,
        isMissing:       false,
      };
    });
  }, [extraSkillIds, allSkills, ratings]);

  // Combobox options for adding extra skills
  const extraSkillOptions: ComboboxOption[] = allSkills
    .filter(s => s.is_active && !matrix.some(r => r.skill_id === s.id) && !extraSkillIds.includes(s.id))
    .map(s => ({ value: String(s.id), label: s.skill_name, sub: s.skill_code }));

  // ── Loading skeleton ──────────────────────────────────────────────────────
  const isLoading = matrixLoading || ratingsLoading;

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{ height: '28px', width: '260px', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: 'var(--space-2)' }} className="skeleton" />
        <div style={{ height: '14px', width: '380px', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: 'var(--space-6)' }} className="skeleton" />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '180px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }} className="skeleton" />
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='pb-20'>
      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              My Skill Assessment
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Rate your current proficiency for each skill mapped to your role
            </p>
          </div>
        </div>
        <div style={{ height: '1px', background: 'var(--color-border)', marginTop: 'var(--space-4)' }} />
      </div>

      {/* Status banner */}
      {isSubmitted ? (
        <RatingStatusBanner
          variant="submitted"
          message="Your self-assessment has been submitted."
          detail={submittedAt
            ? `Submitted on ${new Date(submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Awaiting manager review.`
            : 'Awaiting manager review.'}
          action={
            <Link
              to="/my-skills"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)',
                textDecoration: 'none',
              }}
            >
              View Skill Matrix <ArrowRight size={13} />
            </Link>
          }
        />
      ) : Object.keys(ratings).length > 0 ? (
        <RatingStatusBanner
          variant="draft"
          message="Draft in progress"
          detail="Your ratings are saved as draft. Submit when you're ready for manager review."
        />
      ) : null}

      {/* Missing skills warning */}
      {missingSkillIds.length > 0 && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.20)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          fontSize: '13px',
          color: '#dc2626',
          fontWeight: 500,
        }}>
          Please rate all required skills before submitting. {missingSkillIds.length} skill{missingSkillIds.length !== 1 ? 's' : ''} still need a rating.
        </div>
      )}

      {/* Category sections */}
      {matrix.length === 0 ? (
        <div style={{
          padding: 'var(--space-12) var(--space-8)', textAlign: 'center',
          background: 'var(--color-surface)', border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-4)',
        }}>
          <ClipboardList size={36} style={{ opacity: 0.3, margin: '3px auto' }} />
          <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 3px' }}>No skills mapped to your role</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Ask your admin to map skills to your job role.</p>
        </div>
      ) : (
        categorySections.map(section => (
          <SkillCategorySection
            key={section.name}
            categoryName={section.name}
            skills={section.skills}
            levels={levels}
            onLevelChange={handleLevelChange}
            readOnly={isSubmitted}
          />
        ))
      )}

      {/* Extra skills section */}
      {(extraSkillRows.length > 0 || !isSubmitted) && (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-4)',
          background: 'var(--color-surface)',
        }}>
          {/* Header */}
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface-alt)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Additional Skills
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Skills not in your job role that you want to self-rate
            </span>
          </div>

          {/* Column headers — only shown when there are rows */}
          {extraSkillRows.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isSubmitted ? '1fr 120px 1fr' : '1fr 120px 1fr 32px',
              gap: 'var(--space-4)',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              {(isSubmitted
                ? ['Skill', 'Required Level', 'Rated Level']
                : ['Skill', 'Required Level', 'Your Rating', '']
              ).map((col, i) => (
                <span key={i} style={{
                  fontSize: '10px', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'var(--color-text-muted)',
                }}>
                  {col}
                </span>
              ))}
            </div>
          )}

          {/* Flat skill rows — no nested cards */}
          {extraSkillRows.map(skill => (
            <div
              key={skill.skillId}
              style={{
                display: 'grid',
                gridTemplateColumns: isSubmitted ? '1fr 120px 1fr' : '1fr 120px 1fr 32px',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {/* Skill name */}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {skill.skillName}
              </span>

              {/* Required level — always "—" for extra skills */}
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Not Required</span>

              {/* Level selector */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {isSubmitted ? (
                  skill.selectedLevelId ? (
                    (() => {
                      const selected = levels.find(l => l.id === skill.selectedLevelId);
                      return selected ? (
                        <ProficiencyBadge
                          level={selected.level_name}
                          rank={selected.level_rank}
                        />
                      ) : null;
                    })()
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Not rated</span>
                  )
                ) : (
                  levels.map(level => {
                    const isSelected = skill.selectedLevelId === level.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => handleLevelChange(skill.skillId, level.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 12px', borderRadius: '999px',
                          fontSize: '12px', fontWeight: isSelected ? 600 : 400,
                          cursor: 'pointer', transition: 'all 150ms',
                          border: isSelected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                          background: isSelected ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)',
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        }}
                      >
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                          border: isSelected ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                          background: isSelected ? 'var(--color-accent)' : 'transparent',
                          transition: 'all 150ms',
                        }} />
                        {level.level_name}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Remove button — only in edit mode (4th column) */}
              {!isSubmitted && (
                <button
                  onClick={() => handleRemoveExtraSkill(skill.skillId)}
                  title="Remove skill"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', padding: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)', transition: 'color 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          ))}

          {/* Combobox to add skills */}
          {!isSubmitted && (
            <div style={{ padding: 'var(--space-3) var(--space-4)', position: 'relative', zIndex: 10 }}>
              <Combobox
                options={extraSkillOptions}
                value={[]}
                onChange={ids => {
                  if (ids.length > 0) handleAddExtraSkill(Number(ids[ids.length - 1]));
                }}
                placeholder="+ Search and add a skill…"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes section */}
      {!isSubmitted && (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: 'var(--space-6)',
          background: 'var(--color-surface)',
        }}>
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface-alt)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Additional Notes
            </span>
          </div>
          <div style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observed Performance Hindrances</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Describe any obstacles affecting your performance…"
                value={observations}
                onChange={e => setObservations(e.target.value)}
                style={{ resize: 'vertical', height: 'auto', minHeight: '96px', padding: 'var(--space-2) var(--space-3)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Recent Accomplishments</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Highlight recent achievements or projects…"
                value={accomplishments}
                onChange={e => setAccomplishments(e.target.value)}
                style={{ resize: 'vertical', height: 'auto', minHeight: '96px', padding: 'var(--space-2) var(--space-3)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      {!isSubmitted && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)',
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
            onClick={handleSubmitClick}
            disabled={submitMutation.isPending || saveDraftMutation.isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px', borderRadius: 'var(--radius-md)',
              border: 'none', background: 'var(--color-accent)',
              color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              opacity: (submitMutation.isPending || saveDraftMutation.isPending) ? 0.6 : 1,
            }}
          >
            Submit for Review
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Submit confirmation dialog */}
      <ConfirmationDialog
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Self-Assessment"
        description="Once submitted, you cannot edit your ratings. Your manager will be notified to review your assessment. Continue?"
        confirmLabel="Yes, Submit"
        variant="primary"
        isLoading={submitMutation.isPending || saveDraftMutation.isPending}
      />
    </div>
  );
}
