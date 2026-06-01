/**
 *
 * API calls for SCORM session state management.
 * Follows the same pattern as player-api.ts.
 */

import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { ScormSavedState, ScormCommitPayload } from "@/types/scorm.types";

export const scormApi = {
  /**
   * Load saved SCORM state for a learner + content pair.
   * Called once when ScormPlayer mounts, before the iframe loads.
   * On first visit the backend returns empty defaults (lesson_status: 'not attempted').
   *
   * Endpoint: GET /api/v1/learning/scorm/state/:enrollmentId/:contentId/
   */
  loadState: async (
    enrollmentId: number,
    contentId: number
  ): Promise<ScormSavedState | null> => {
    try {
      const response = await apiClient.get(
        `/learning/scorm/state/${enrollmentId}/${contentId}/`
      );
      return handleApiResponse<ScormSavedState>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Commit SCORM variable snapshot to the backend.
   * Called on every LMSCommit / Commit event from scorm-again,
   * and also on LMSFinish / Terminate.
   *
   * Endpoint: POST /api/v1/learning/scorm/commit/
   */
  commit: async (
    payload: ScormCommitPayload
  ): Promise<{ lesson_status: string } | null> => {
    try {
      const response = await apiClient.post("/learning/scorm/commit/", payload);
      return handleApiResponse<{ lesson_status: string }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
