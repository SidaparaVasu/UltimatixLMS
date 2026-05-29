import React, { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { AdminMasterLayout } from '@/components/admin/layout/AdminMasterLayout';
import { AdminInput, AdminToggle } from '@/components/admin/form';
import { AdminDataTable, DataTableColumn } from '@/components/admin/layout/AdminDataTable';
import { TableCell } from '@/components/ui/table';
import { GamificationErrorState } from '@/modules/gamification/components/GamificationErrorState';
import {
  useGamificationAdminEnabled,
  useGamificationAwardRules,
  useGamificationCompanyConfig,
  useUpdateAwardRule,
  useUpdateGamificationConfig,
} from '@/modules/gamification/hooks/useGamificationAdminQueries';
import type { AwardRule, CompanyGamificationConfig } from '@/modules/gamification/types';

interface ConfigFormState {
  is_enabled: boolean;
  inactive_leaderboard_days: string;
  learning_streak_min_seconds: string;
  mandatory_course_xp_multiplier: string;
  retake_xp_percent_2nd: string;
  retake_xp_percent_3rd_plus: string;
  streak_daily_xp_bonus: string;
}

function configToForm(config: CompanyGamificationConfig): ConfigFormState {
  return {
    is_enabled: config.is_enabled,
    inactive_leaderboard_days: String(config.inactive_leaderboard_days),
    learning_streak_min_seconds: String(config.learning_streak_min_seconds),
    mandatory_course_xp_multiplier: String(config.mandatory_course_xp_multiplier),
    retake_xp_percent_2nd: String(config.retake_xp_percent_2nd),
    retake_xp_percent_3rd_plus: String(config.retake_xp_percent_3rd_plus),
    streak_daily_xp_bonus: String(config.streak_daily_xp_bonus),
  };
}

function mergeAwardRulesByCode(rules: AwardRule[]): AwardRule[] {
  const merged: AwardRule[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.code)) continue;
    seen.add(rule.code);
    merged.push(rule);
  }
  return merged;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-6)',
  marginBottom: 'var(--space-6)',
};

export default function GamificationSettingsPage() {
  const { healthLoading, globalEnabled, companyEnabled } = useGamificationAdminEnabled();
  const configQuery = useGamificationCompanyConfig();
  const rulesQuery = useGamificationAwardRules();
  const updateConfig = useUpdateGamificationConfig();
  const updateRule = useUpdateAwardRule();

  const [configForm, setConfigForm] = useState<ConfigFormState | null>(null);
  const [ruleEdits, setRuleEdits] = useState<Record<number, { base_points: string; multiplier: string; is_active: boolean }>>({});

  useEffect(() => {
    if (configQuery.data) {
      setConfigForm(configToForm(configQuery.data));
    }
  }, [configQuery.data]);

  const effectiveRules = useMemo(
    () => mergeAwardRulesByCode(rulesQuery.data ?? []),
    [rulesQuery.data],
  );

  useEffect(() => {
    const next: Record<number, { base_points: string; multiplier: string; is_active: boolean }> = {};
    for (const rule of effectiveRules) {
      next[rule.id] = {
        base_points: String(rule.base_points),
        multiplier: String(rule.multiplier),
        is_active: rule.is_active,
      };
    }
    setRuleEdits(next);
  }, [effectiveRules]);

  const setConfigField = <K extends keyof ConfigFormState>(key: K, value: ConfigFormState[K]) => {
    setConfigForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveConfig = async () => {
    if (!configForm) return;
    try {
      await updateConfig.mutateAsync({
        is_enabled: configForm.is_enabled,
        inactive_leaderboard_days: Number(configForm.inactive_leaderboard_days),
        learning_streak_min_seconds: Number(configForm.learning_streak_min_seconds),
        mandatory_course_xp_multiplier: Number(configForm.mandatory_course_xp_multiplier),
        retake_xp_percent_2nd: Number(configForm.retake_xp_percent_2nd),
        retake_xp_percent_3rd_plus: Number(configForm.retake_xp_percent_3rd_plus),
        streak_daily_xp_bonus: Number(configForm.streak_daily_xp_bonus),
      });
    } catch {
      /* toast handled in API layer */
    }
  };

  const handleSaveRule = async (rule: AwardRule) => {
    const edit = ruleEdits[rule.id];
    if (!edit) return;
    try {
      await updateRule.mutateAsync({
        ruleId: rule.id,
        payload: {
          base_points: Number(edit.base_points),
          multiplier: Number(edit.multiplier),
          is_active: edit.is_active,
        },
      });
    } catch {
      /* toast handled in API layer */
    }
  };

  const ruleColumns: DataTableColumn<AwardRule>[] = [
    {
      type: 'custom',
      header: 'Rule',
      render: (row) => (
        <TableCell>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{row.code}</div>
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Base XP',
      width: '150px',
      render: (row) => (
        <TableCell>
          <input
            className="form-input"
            type="number"
            min={0}
            value={ruleEdits[row.id]?.base_points ?? ''}
            onChange={(e) =>
              setRuleEdits((prev) => ({
                ...prev,
                [row.id]: {
                  base_points: e.target.value,
                  multiplier: prev[row.id]?.multiplier ?? String(row.multiplier),
                  is_active: prev[row.id]?.is_active ?? row.is_active,
                },
              }))
            }
            style={{ width: '100%' }}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Multiplier',
      width: '150px',
      render: (row) => (
        <TableCell>
          <input
            className="form-input"
            type="number"
            min={0}
            step="0.01"
            value={ruleEdits[row.id]?.multiplier ?? ''}
            onChange={(e) =>
              setRuleEdits((prev) => ({
                ...prev,
                [row.id]: {
                  base_points: prev[row.id]?.base_points ?? String(row.base_points),
                  multiplier: e.target.value,
                  is_active: prev[row.id]?.is_active ?? row.is_active,
                },
              }))
            }
            style={{ width: '100%' }}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: 'Active',
      width: '90px',
      render: (row) => (
        <TableCell>
          <input
            type="checkbox"
            checked={ruleEdits[row.id]?.is_active ?? false}
            onChange={(e) =>
              setRuleEdits((prev) => ({
                ...prev,
                [row.id]: {
                  base_points: prev[row.id]?.base_points ?? String(row.base_points),
                  multiplier: prev[row.id]?.multiplier ?? String(row.multiplier),
                  is_active: e.target.checked,
                },
              }))
            }
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
          />
        </TableCell>
      ),
    },
    {
      type: 'custom',
      header: '',
      width: '110px',
      render: (row) => (
        <TableCell>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={updateRule.isPending}
            onClick={() => void handleSaveRule(row)}
          >
            Save
          </button>
          {row.is_company_override ? (
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                marginTop: '4px',
              }}
            >
              Custom
            </span>
          ) : null}
        </TableCell>
      ),
    },
  ];

  if (!globalEnabled && !healthLoading) {
    return (
      <AdminMasterLayout
        title="Gamification Settings"
        description="Configure XP, streaks, and award rules for your organization."
        icon={Trophy}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Gamification' }]}
      >
        <div style={cardStyle}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            The gamification feature flag is disabled system-wide. Ask a platform administrator to enable{' '}
            <code>gamification_enabled</code> before configuring rewards for this company.
          </p>
        </div>
      </AdminMasterLayout>
    );
  }

  if (healthLoading || configQuery.isLoading) {
    return (
      <AdminMasterLayout
        title="Gamification Settings"
        description="Configure XP, streaks, and award rules for your organization."
        icon={Trophy}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Gamification' }]}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>Loading settings…</p>
      </AdminMasterLayout>
    );
  }

  if (configQuery.isError || !configForm) {
    return (
      <AdminMasterLayout
        title="Gamification Settings"
        icon={Trophy}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Gamification' }]}
      >
        <GamificationErrorState
          title="Could not load gamification settings"
          onRetry={() => void configQuery.refetch()}
        />
      </AdminMasterLayout>
    );
  }

  return (
    <AdminMasterLayout
      title="Gamification Settings"
      description="Enable rewards for learners, tune streak and leaderboard rules, and override XP award values."
      icon={Trophy}
      breadcrumbs={[{ label: 'Admin' }, { label: 'Gamification' }]}
    >
      {!companyEnabled ? (
        <div
          style={{
            ...cardStyle,
            background: 'var(--color-warning-bg, #fff8e6)',
            borderColor: 'var(--color-warning-border, #f5d78e)',
          }}
        >
          <strong>Learner rewards are off.</strong> Turn on &quot;Enable gamification&quot; below so XP,
          badges, and leaderboards appear for your company.
        </div>
      ) : null}

      <section style={cardStyle}>
        <h2
          style={{
            margin: '0 0 var(--space-4)',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          Company settings
        </h2>

        <AdminToggle
          label="Enable gamification"
          hint="When off, learners will not earn XP or see leaderboards."
          checked={configForm.is_enabled}
          onChange={(v) => setConfigField('is_enabled', v)}
          style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-4)',
          }}
        >
          <AdminInput
            label="Inactive leaderboard days"
            type="number"
            value={configForm.inactive_leaderboard_days}
            onChange={(v) => setConfigField('inactive_leaderboard_days', v)}
            hint="Hide users with no activity after this many days."
          />
          <AdminInput
            label="Learning streak min (seconds)"
            type="number"
            value={configForm.learning_streak_min_seconds}
            onChange={(v) => setConfigField('learning_streak_min_seconds', v)}
            hint="Minimum daily course engagement to count a streak day."
          />
          <AdminInput
            label="Mandatory course XP multiplier"
            type="number"
            value={configForm.mandatory_course_xp_multiplier}
            onChange={(v) => setConfigField('mandatory_course_xp_multiplier', v)}
          />
          <AdminInput
            label="Retake XP % (2nd attempt)"
            type="number"
            value={configForm.retake_xp_percent_2nd}
            onChange={(v) => setConfigField('retake_xp_percent_2nd', v)}
          />
          <AdminInput
            label="Retake XP % (3rd+ attempt)"
            type="number"
            value={configForm.retake_xp_percent_3rd_plus}
            onChange={(v) => setConfigField('retake_xp_percent_3rd_plus', v)}
          />
          <AdminInput
            label="Streak daily XP bonus"
            type="number"
            value={configForm.streak_daily_xp_bonus}
            onChange={(v) => setConfigField('streak_daily_xp_bonus', v)}
          />
        </div>

        <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={updateConfig.isPending}
            onClick={() => void handleSaveConfig()}
          >
            {updateConfig.isPending ? 'Saving…' : 'Save company settings'}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2
          style={{
            margin: '0 0 var(--space-2)',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          Award rules (XP)
        </h2>
        <p style={{ margin: '0 0 var(--space-4)', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Adjust base points per event. Saving creates a company-specific override when needed.
        </p>

        {rulesQuery.isError ? (
          <GamificationErrorState
            title="Could not load award rules"
            onRetry={() => void rulesQuery.refetch()}
          />
        ) : (
          <AdminDataTable
            columns={ruleColumns}
            data={effectiveRules}
            rowKey="id"
            isLoading={rulesQuery.isLoading}
            emptyMessage="No award rules found."
          />
        )}
      </section>
    </AdminMasterLayout>
  );
}
