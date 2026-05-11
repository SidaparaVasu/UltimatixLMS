// ── Skill mapping shown on catalog card ──────────────────────────────────────
export interface CatalogSkillMapping {
  skill_id: number;
  skill_name: string;
  skill_level_id: number;
  skill_level_name: string;
}

// ── Catalog item (returned by GET /assessment/catalog/ and GET /assessment/catalog/:id/) ──
export interface CatalogItem {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  passing_percentage: string;
  retake_limit: number;
  retake_cooldown_hours: number;
  number_of_questions: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  attempts_used: number;
  attempts_remaining: number;
  last_result_status: 'PASS' | 'FAIL' | 'PENDING' | null;
  last_attempt_id: string | null;
  /** UUID of the current IN_PROGRESS attempt, or null if none active. */
  active_attempt_id: string | null;
  cooldown_remaining_hours: number;
  skill_mappings: CatalogSkillMapping[];
}

// ── Start attempt payload ─────────────────────────────────────────────────────
export interface StartAttemptPayload {
  assessment_id: number;
}

// ── Start attempt response ────────────────────────────────────────────────────
export interface StartAttemptResult {
  id: string;           // attempt UUID
  assessment: number;
  status: string;
  started_at: string;
  expires_at: string;
}
