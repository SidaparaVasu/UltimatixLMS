import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tniApi } from '@/api/tni-api';
import {
  SelfRatingBulkSavePayload,
  ManagerRatingSubmitPayload,
  ApprovalFinalizePayload,
  SkillRatingListParams,
  SkillRatingHistoryParams,
  TrainingNeedListParams,
} from '@/types/tni.types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const TNI_QUERY_KEYS = {
  mySkillMatrix:        ['tni', 'my-skill-matrix'],
  skillRatings:         (params?: SkillRatingListParams) => ['tni', 'skill-ratings', params],
  skillRatingHistory:   (params?: SkillRatingHistoryParams) => ['tni', 'skill-rating-history', params],
  trainingNeeds:        (params?: TrainingNeedListParams) => ['tni', 'training-needs', params],
  myTrainingNeeds:      (params?: { status?: string }) => ['tni', 'my-training-needs', params],
  teamSubmitted:        ['tni', 'team-submitted'],
  managerReviewMatrix:  (employeeId: number) => ['tni', 'manager-review-matrix', employeeId],
};

// ---------------------------------------------------------------------------
// Skill matrix
// ---------------------------------------------------------------------------

/** Composite skill matrix for the current user (required level + current + ratings + gap) */
export const useMySkillMatrix = () =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.mySkillMatrix,
    queryFn:  tniApi.getMySkillMatrix,
  });

/** All direct reports who have submitted a self-rating (reviewed or not) */
export const useTeamSubmitted = () =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.teamSubmitted,
    queryFn:  tniApi.getTeamSubmitted,
  });

/** Composite manager review matrix for a specific employee */
export const useManagerReviewMatrix = (employeeId: number | null) =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.managerReviewMatrix(employeeId ?? 0),
    queryFn:  () => tniApi.getManagerReviewMatrix(employeeId!),
    enabled:  !!employeeId,
  });

// ---------------------------------------------------------------------------
// Skill ratings
// ---------------------------------------------------------------------------

/** List rating rows — defaults to current user's own ratings */
export const useSkillRatings = (params?: SkillRatingListParams) =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.skillRatings(params),
    queryFn:  () => tniApi.getSkillRatings(params),
  });

/** Rating history for an employee */
export const useSkillRatingHistory = (params?: SkillRatingHistoryParams) =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.skillRatingHistory(params),
    queryFn:  () => tniApi.getSkillRatingHistory(params),
  });

// ---------------------------------------------------------------------------
// Self-rating mutations
// ---------------------------------------------------------------------------

/** Bulk upsert DRAFT self-ratings (silent — no toast on each auto-save) */
export const useSaveSelfRatingDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SelfRatingBulkSavePayload) =>
      tniApi.saveSelfRatingDraft(payload, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TNI_QUERY_KEYS.skillRatings() });
    },
  });
};

/** Bulk submit all DRAFT self-ratings */
export const useSubmitSelfRatings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tniApi.submitSelfRatings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TNI_QUERY_KEYS.skillRatings() });
      qc.invalidateQueries({ queryKey: TNI_QUERY_KEYS.mySkillMatrix });
    },
  });
};

// ---------------------------------------------------------------------------
// Manager-rating mutations
// ---------------------------------------------------------------------------

/** Bulk upsert DRAFT manager ratings (silent) */
export const useSaveManagerRatingDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManagerRatingSubmitPayload) =>
      tniApi.saveManagerRatingDraft(payload, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TNI_QUERY_KEYS.skillRatings() });
    },
  });
};

/** Submit manager ratings + trigger gap analysis */
export const useSubmitManagerRatings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManagerRatingSubmitPayload) =>
      tniApi.submitManagerRatings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TNI_QUERY_KEYS.skillRatings() });
      qc.invalidateQueries({ queryKey: TNI_QUERY_KEYS.mySkillMatrix });
      qc.invalidateQueries({ queryKey: ['tni', 'training-needs'] });
    },
  });
};

// ---------------------------------------------------------------------------
// Training needs
// ---------------------------------------------------------------------------

/** All training needs — admin/manager view */
export const useTrainingNeeds = (params?: TrainingNeedListParams) =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.trainingNeeds(params),
    queryFn:  () => tniApi.getTrainingNeeds(params),
  });

/** Current user's own training needs */
export const useMyTrainingNeeds = (params?: { status?: string }) =>
  useQuery({
    queryKey: TNI_QUERY_KEYS.myTrainingNeeds(params),
    queryFn:  () => tniApi.getMyTrainingNeeds(params),
  });

// ---------------------------------------------------------------------------
// Approval mutation
// ---------------------------------------------------------------------------

/** Approve or reject a training need */
export const useFinalizeApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ApprovalFinalizePayload }) =>
      tniApi.finalizeApproval(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tni', 'training-needs'] });
    },
  });
};
