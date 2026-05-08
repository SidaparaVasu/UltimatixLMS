import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentCatalogApi } from '@/api/assessment-catalog-api';
import { StartAttemptPayload } from '@/types/assessment-catalog.types';

export const CATALOG_KEYS = {
  all:  () => ['assessment-catalog'] as const,
  list: () => ['assessment-catalog', 'list'] as const,
};

/**
 * Fetches all published standalone assessments for the learner catalog.
 * Includes attempt history, cooldown status, and skill mappings per card.
 * staleTime of 60s avoids redundant refetches during normal browsing.
 */
export const useAssessmentCatalog = () =>
  useQuery({
    queryKey: CATALOG_KEYS.list(),
    queryFn:  () => assessmentCatalogApi.list(),
    staleTime: 60_000,
  });

/**
 * Starts a new assessment attempt.
 * Invalidates the catalog on success so attempt counts and button states refresh.
 */
export const useStartAttempt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartAttemptPayload) =>
      assessmentCatalogApi.startAttempt(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_KEYS.all() });
    },
  });
};
