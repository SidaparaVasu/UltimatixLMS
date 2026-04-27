export interface CourseCategory {
  id: number;
  category_name: string;
  category_code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  // Read-only fields often added by serializers or requirements
  course_count?: number; 
}

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CourseMaster {
  id: number;
  course_title: string;
  course_code: string;
  category: number;
  description: string;
  difficulty_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | undefined;
  estimated_duration_hours: number;
  /** Date from which the course becomes accessible to participants (ISO date string, e.g. "2026-05-01"). */
  start_date: string | null;
  /** Date after which the course is no longer accessible (ISO date string). */
  end_date: string | null;
  /** If true, learners can see their assessment scores after completion. */
  show_marks_to_learners: boolean;
  status: CourseStatus;
  created_by?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Read-only populated fields
  category_name?: string;
  created_by_name?: string;
  /** Total number of invited participants for this course. */
  participant_count?: number;
  sections?: CourseSection[];
  tags?: CourseTagMap[];
  skills?: CourseSkillMapping[];
  resources?: CourseResource[];
}

export interface CourseResource {
  id: number;
  course: number;
  resource_title: string;
  resource_url: string;
  file_ref?: number | null;
  file_url?: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Represents an employee who has been explicitly invited to a course by an admin.
 * Distinct from UserCourseEnrollment which tracks learning progress.
 */
export interface CourseParticipant {
  id: number;
  course: number;
  employee: number;
  employee_code: string;
  employee_full_name: string;
  employee_email: string;
  invited_by: number | null;
  invited_at: string;
  /** Will be true once the notification module dispatches the invite email. */
  notification_sent: boolean;
}

export interface CourseParticipantBulkInvitePayload {
  employee_ids: number[];
}

export interface CourseSection {
  id: number;
  course: number;
  section_title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: number;
  section: number;
  lesson_title: string;
  display_order: number;
  estimated_duration_minutes: number;
  require_mark_complete: boolean;
  is_active: boolean;
  created_at: string;
  contents?: CourseContent[];
  assessment_id?: number | null;  // linked AssessmentMaster id if lesson has a quiz
}

export type CourseContentType =
  | 'VIDEO'
  | 'PDF'
  | 'PPT'
  | 'DOCUMENT'
  | 'LINK'
  | 'QUIZ';

export interface CourseContent {
  id: number;
  lesson: number;
  content_type: CourseContentType;
  content_url: string;
  file_path: string;
  file_ref?: number | null;
  file_url?: string | null;
  display_order: number;
  created_at: string;
}

export interface TagMaster {
  id: number;
  tag_name: string;
  description: string;
  created_at: string;
}

export interface CourseTagMap {
  id: number;
  course: number;
  tag: number;
  tag_name?: string;
  created_at: string;
}

export interface CourseSkillMapping {
  id: number;
  course: number;
  skill: number;
  skill_name?: string;
  target_level: number;
  target_level_name?: string;
  created_at: string;
}

export interface CourseDetail extends CourseMaster {
  sections: CourseSection[];
  tags: CourseTagMap[];
  skills: CourseSkillMapping[];
}

export interface CurriculumSyncContentPayload {
  id?: number;
  content_type: CourseContentType;
  content_url: string;
  file_ref?: number | null;
  display_order: number;
}

export interface CurriculumSyncLessonPayload {
  id?: number;
  lesson_title: string;
  estimated_duration_minutes: number;
  require_mark_complete: boolean;
  display_order: number;
  contents: CurriculumSyncContentPayload[];
}

export interface CurriculumSyncSectionPayload {
  id?: number;
  section_title: string;
  description?: string;
  display_order: number;
  lessons: CurriculumSyncLessonPayload[];
}

export interface CurriculumSyncPayload {
  sections: CurriculumSyncSectionPayload[];
}

// Enrollment status from backend constants
export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';

// Enrollment type from backend constants
export type EnrollmentType = 'SELF_ENROLL' | 'MANDATORY' | 'RECOMMENDED' | 'TNI_ASSIGNED';

export interface UserCourseEnrollment {
  id: number;
  course: number;
  course_title: string;
  course_code: string;
  category_name: string;
  enrollment_type: EnrollmentType;
  status: EnrollmentStatus;
  progress_percentage: string; // decimal string from backend e.g. "45.00"
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CourseCertificate {
  id: number;
  enrollment: number;
  certificate_number: string;
  issued_at: string;
  expiry_date: string | null;
  verification_code: string;
}

export interface EnrollRequest {
  course_id: number;
}