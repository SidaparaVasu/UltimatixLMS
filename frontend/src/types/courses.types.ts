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
  difficulty_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'DOCTOR' | undefined;
  estimated_duration_hours: number;
  status: CourseStatus;
  created_by?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Read-only populated fields
  category_name?: string;
  created_by_name?: string;
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