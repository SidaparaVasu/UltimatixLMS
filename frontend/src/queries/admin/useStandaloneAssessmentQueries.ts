import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { standaloneAssessmentApi } from '@/api/standalone-assessment-api';
import {
  AssessmentFormValues,
  SkillMappingPayload,
} from '@/types/standalone-assessment.types';

export const STANDALONE_ASSESSMENT_KEYS = {
  all:    () => ['standalone-assessment'] as const,
  list:   (params?: object) => ['standalone-assessment', 'list', params] as const,
  detail: (id: number)      => ['standalone-assessment', 'detail', id] as const,
  mappings: (assessmentId: number) => ['standalone-assessment', 'mappings', assessmentId] as const,
};

/**
 * Fetches the paginated list of standalone assessments.
 */
export const useStandaloneAssessmentList = (params?: { page?: number }) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.list(params),
    queryFn:  () => standaloneAssessmentApi.list(params),
    staleTime: 30_000,
  });

/**
 * Fetches a single standalone assessment by ID (includes skill_mappings).
 */
export const useStandaloneAssessmentDetail = (id: number | null) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.detail(id!),
    queryFn:  () => standaloneAssessmentApi.detail(id!),
    enabled:  id !== null,
    staleTime: 0,
  });

/**
 * Fetches skill mappings for a given assessment.
 */
export const useAssessmentSkillMappings = (assessmentId: number | null) =>
  useQuery({
    queryKey: STANDALONE_ASSESSMENT_KEYS.mappings(assessmentId!),
    queryFn:  () => standaloneAssessmentApi.listSkillMappings(assessmentId!),
    enabled:  assessmentId !== null,
    staleTime: 0,
  });

/**
 * Creates a new standalone assessment. Invalidates the list on success.
 */
export const useCreateStandaloneAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AssessmentFormValues) => standaloneAssessmentApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STANDALONE_ASSESSMENT_KEYS.all() });
    },
  });
};

/**
 * Updates an existing standalone assessment. Invalidates list and detail on success.
 */
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

/**
 * Adds a skill mapping to an assessment.
 */
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

/**
 * Deletes a skill mapping by ID.
 */
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
