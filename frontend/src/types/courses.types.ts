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

export interface CourseMaster {
  id: number;
  course_title: string;
  course_code: string;
  category: number;
  description: string;
  difficulty_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'DOCTOR' | undefined;
  estimated_duration_hours: number;
  created_by?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Read-only populated fields
  category_name?: string;
  created_by_name?: string;
  sections?: CourseSection[];
  tags?: any[];
  skills?: any[];
}

export interface CourseSection {
  id: number;
  course: number;
  section_title: string;
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
  is_active: boolean;
  created_at: string;
  contents?: CourseContent[];
}

export interface CourseContent {
  id: number;
  lesson: number;
  content_type: 'VIDEO' | 'PDF' | 'QUIZ' | 'LINK' | 'DOCUMENT';
  content_url: string;
  file_path: string;
  display_order: number;
  created_at: string;
}
