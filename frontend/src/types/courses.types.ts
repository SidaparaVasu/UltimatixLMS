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