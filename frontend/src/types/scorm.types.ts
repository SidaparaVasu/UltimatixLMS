/**
 *
 * Types for the SCORM player integration.
 * Maps to fields stored in UserSCORMProgress on the backend.
 */

export type ScormVersion = '1.2' | '2004_2nd' | '2004_3rd' | '2004_4th';

/**
 * Saved SCORM state loaded from GET /api/v1/learning/scorm/state/:eid/:cid/
 * Fed into scorm-again as initialData so the course resumes from last position.
 */
export interface ScormSavedState {
  lesson_status: string;
  lesson_location: string;
  suspend_data: string;
  score_raw: string | null;
  score_max: string | null;
  score_min: string | null;
  total_time_seconds: number;
  scorm_variables: Record<string, string>;
  attempt_count: number;
}

/**
 * Commit payload sent to POST /api/v1/learning/scorm/commit/
 * scorm_data is the raw cmi.* variable dict from scorm-again's current data model.
 */
export interface ScormCommitPayload {
  enrollment_id: number;
  content_id: number;
  lesson_id: number;
  scorm_data: Record<string, string>;
}

/**
 * SCORM package metadata returned inside CourseContent.scorm_package
 * from the enrollment detail endpoint.
 * The ScormPlayer component reads this to know what to launch.
 */
export interface ScormPackageMeta {
  package_id: string;        // FileRegistry UUID
  scorm_version: ScormVersion;
  launch_url: string;        // relative path inside the package e.g. 'index.html'
  title: string;
  content_url: string | null; // browser-loadable URL built by the backend
}
