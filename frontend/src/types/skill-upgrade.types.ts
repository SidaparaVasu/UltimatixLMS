// ── Skill upgrade proposal (returned by GET /assessment/skill-upgrade-proposals/) ──
export interface SkillUpgradeProposal {
  id: number;
  employee_code: string;
  employee_name: string;
  skill: number;
  skill_name: string;
  proposed_level: number;
  proposed_level_name: string;
  assessment_attempt: string;   // UUID
  assessment_title: string;
  status: 'PENDING' | 'APPROVED';
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}

// ── Filters for the proposals list ───────────────────────────────────────────
export interface SkillUpgradeFilters {
  status?: 'PENDING' | 'APPROVED';
  page?: number;
}
