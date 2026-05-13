import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { standaloneAssessmentApi } from '@/api/standalone-assessment-api';
import {
  AssessmentFormValues,
  SkillMappingPayload,
  QuestionMappingPayload,
  ReorderMappingsPayload,
} from '@/types/standalone-assessment.types';

export const STANDALONE_ASSESSMENT_KEYS = {
  all:              () => ['standalone-assessment'] as const,
  list:             (params?: object) => ['standalone-assessment', 'list', params] as const,
  detail:           (id: number)      => ['standalone-assessment', 'detail', id] as const,
  mappings:         (assessmentId: number) => ['standalone-assessment', 'mappings', assessmentId] as const,
  questionMappings: (assessmentId: number) => ['standalone-assessment', 'question-mappings', assessmentId] as const,
  availability:     (assessmentId: number) => ['standalone-assessment', 'availability', assessmentId] as const,
};

// ── Assessment list ───────────────────────────────────────────────────────────

export const useStandaloneAssessmentList = (params?: { page?: number; page_size?: number }) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.list(params),
    queryFn:  () => standaloneAssessmentApi.list(params),
    staleTime: 30_000,
  });

// ── Assessment detail ─────────────────────────────────────────────────────────

export const useStandaloneAssessmentDetail = (id: number | null) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.detail(id!),
    queryFn:  () => standaloneAssessmentApi.detail(id!),
    enabled:  id !== null,
    staleTime: 0,
  });

// ── Skill mappings ────────────────────────────────────────────────────────────

export const useAssessmentSkillMappings = (assessmentId: number | null) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.mappings(assessmentId!),
    queryFn:  () => standaloneAssessmentApi.listSkillMappings(assessmentId!),
    enabled:  assessmentId !== null,
    staleTime: 0,
  });

// ── Create / Update ───────────────────────────────────────────────────────────

export const useCreateStandaloneAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssessmentFormValues) => standaloneAssessmentApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.all() });
    },
  });
};

export const useUpdateStandaloneAssessment = (id: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AssessmentFormValues>) =>
      standaloneAssessmentApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.all() });
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.detail(id) });
    },
  });
};

// ── Skill mapping mutations ───────────────────────────────────────────────────

export const useAddSkillMapping = (assessmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SkillMappingPayload) => standaloneAssessmentApi.addSkillMapping(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.mappings(assessmentId) });
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.detail(assessmentId) });
    },
  });
};

export const useDeleteSkillMapping = (assessmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => standaloneAssessmentApi.deleteSkillMapping(mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.mappings(assessmentId) });
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.detail(assessmentId) });
    },
  });
};

// ── Question mappings (CURATED mode) ─────────────────────────────────────────

/**
 * Fetches all questions mapped to a CURATED assessment, ordered by display_order.
 */
export const useQuestionMappings = (assessmentId: number | null) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.questionMappings(assessmentId!),
    queryFn:  () => standaloneAssessmentApi.listQuestionMappings(assessmentId!),
    enabled:  assessmentId !== null,
    staleTime: 0,
  });

/**
 * Maps a question to a CURATED assessment.
 * Invalidates the question mappings list and assessment detail on success.
 */
export const useAddQuestionMapping = (assessmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuestionMappingPayload) =>
      standaloneAssessmentApi.addQuestionMapping(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.questionMappings(assessmentId) });
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.detail(assessmentId) });
    },
  });
};

/**
 * Removes a question from a CURATED assessment.
 */
export const useRemoveQuestionMapping = (assessmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) =>
      standaloneAssessmentApi.removeQuestionMapping(mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.questionMappings(assessmentId) });
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.detail(assessmentId) });
    },
  });
};

/**
 * Bulk-updates display_order for a list of question mappings.
 * Used by the drag-to-reorder interaction in the question picker.
 */
export const useReorderQuestionMappings = (assessmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderMappingsPayload) =>
      standaloneAssessmentApi.reorderQuestionMappings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.questionMappings(assessmentId) });
    },
  });
};

// ── Studio actions ────────────────────────────────────────────────────────────

/**
 * Runs the DynamicQuestionSelector and returns a suggested question list
 * WITHOUT saving anything. Used by the Auto Suggestion flow.
 */
export const useSuggestQuestions = (assessmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => standaloneAssessmentApi.suggestQuestions(assessmentId),
  });
};

/**
 * Checks whether the question bank has enough questions for this assessment.
 * Runs automatically when the assessment has skill mappings.
 * staleTime is short (10s) so the indicator stays fresh as the admin edits.
 */
export const useCheckAvailability = (assessmentId: number | null) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.availability(assessmentId!),
    queryFn:  () => standaloneAssessmentApi.checkAvailability(assessmentId!),
    enabled:  assessmentId !== null,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

/**
 * Checks availability WITHOUT a saved assessment ID.
 * Used by the create form (and edit form when skill mappings change) to show
 * real-time availability feedback before the assessment is saved.
 *
 * Returns a mutation so the caller controls when to fire it (debounced).
 */
export const useCheckAvailabilityPreview = () =>
  useMutation({
    mutationFn: (payload: {
      skill_mappings: Array<{ skill: number; skill_level: number }>;
      number_of_questions: number;
    }) => standaloneAssessmentApi.checkAvailabilityPreview(payload),
  });
