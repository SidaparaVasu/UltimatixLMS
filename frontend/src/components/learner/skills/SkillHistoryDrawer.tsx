import React from 'react';
import { X, ArrowRight, Trophy, User, Users, Settings, Loader2, History } from 'lucide-react';
import { useMySkillHistory } from '@/queries/learner/useSkillHistoryQueries';
import { SkillHistoryEntry, SkillChangeReason } from '@/types/skill-history.types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface SkillHistoryDrawerProps {
  open: boolean;
  skillId: number;
  skillName: string;
  onClose: () => void;
}

// ── Reason config ─────────────────────────────────────────────────────────────

const REASON_CONFIG: Record<SkillChangeReason, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  ASSESSMENT_AUTO:     { label: 'Assessment — Auto Assigned', icon: Trophy,   color: '#1d4ed8' },
  ASSESSMENT_APPROVED: { label: 'Assessment — Approved',      icon: Trophy,   color: '#1d4ed8' },
  MANAGER_RATING:      { label: 'Manager Rating',             icon: Users,    color: '#6d28d9' },
  SELF_RATING:         { label: 'Self Rating',                icon: User,     color: '#4b5563' },
  ADMIN_OVERRIDE:      { label: 'Admin Override',             icon: Settings, color: '#b45309' },
};

// ── Timeline entry ────────────────────────────────────────────────────────────

function TimelineEntry({ entry }: { entry: SkillHistoryEntry }) {
  const cfg   = REASON_CONFIG[entry.change_reason] ?? REASON_CONFIG.ADMIN_OVERRIDE;
  const Icon  = cfg.icon;
  const isNew = entry.old_level === null;
  const isUpgrade = (entry.new_level_rank ?? 0) > (entry.old_level_rank ?? 0);

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      paddingBottom: '20px',
      position: 'relative',
    }}>
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
          border: `1.5px solid color-mix(in srgb, ${cfg.color} 30%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} style={{ color: cfg.color }} />
        </div>
        {/* Vertical line — rendered by parent's border-left on the container */}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: '4px' }}>
        {/* Level change */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          {isNew ? (
            <span style={{
              padding: '2px 8px', borderRadius: '999px',
              background: 'rgba(22,163,74,0.08)', color: '#15803d',
              fontSize: '12px', fontWeight: 700,
            }}>
              Added — {entry.new_level_name ?? '—'}
            </span>
          ) : (
            <>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                {entry.old_level_name ?? '—'}
              </span>
              <ArrowRight size={12} style={{ color: isUpgrade ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
              <span style={{
                fontSize: '13px', fontWeight: 700,
                color: isUpgrade ? '#15803d' : '#dc2626',
              }}>
                {entry.new_level_name ?? '—'}
              </span>
            </>
          )}
        </div>

        {/* Reason + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>
            {cfg.label}
          </span>
          {entry.changed_by_name && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              by {entry.changed_by_name}
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            {new Date(entry.changed_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export default function SkillHistoryDrawer({
  open,
  skillId,
  skillName,
  onClose,
}: SkillHistoryDrawerProps) {
  const { data, isLoading } = useMySkillHistory(open ? skillId : undefined);
  const entries = data?.results ?? [];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 200,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '380px',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <History size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Skill History
            </p>
            <p style={{
              margin: '1px 0 0', fontSize: '12px', color: 'var(--color-text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {skillName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'transparent',
              color: 'var(--color-text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '40px 16px', textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}>
              <History size={32} style={{ opacity: 0.25, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>No history yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Changes to this skill level will appear here.
              </p>
            </div>
          )}

          {!isLoading && entries.length > 0 && (
            <div style={{
              borderLeft: '2px solid var(--color-border)',
              paddingLeft: '0',
              marginLeft: '16px',
            }}>
              {entries.map(entry => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
