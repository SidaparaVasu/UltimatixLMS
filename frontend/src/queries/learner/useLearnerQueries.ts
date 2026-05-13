import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learningApi } from '@/api/learning-api';
import { courseApi } from '@/api/course-api';
import { EnrollRequest } from '@/types/courses.types';

export const LEARNER_QUERY_KEYS = {
  catalog: (params?: any) => ['learner', 'catalog', params],
  courseDetail: (id: number) => ['learner', 'course-detail', id],
  myEnrollments: (params?: any) => ['learner', 'my-enrollments', params],
  certificates: ['learner', 'certificates'],
  categories: ['learner', 'categories'],
};

// Published course catalog with filters
export const useCourseCatalog = (params?: {
  status?: string;
  category?: number;
  difficulty_level?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) =>
  useQuery({
    queryKey: LEARNER_QUERY_KEYS.catalog(params),
    queryFn: () => courseApi.getCourses({ status: 'PUBLISHED', ...params }),
  });

// Full course detail for detail page
export const useCourseDetail = (id: number) =>
  useQuery({
    queryKey: LEARNER_QUERY_KEYS.courseDetail(id),
    queryFn: () => courseApi.getCourseDetails(id),
    enabled: !!id,
  });

// Current user enrollments
export const useMyEnrollments = (params?: { status?: string }) =>
  useQuery({
    queryKey: LEARNER_QUERY_KEYS.myEnrollments(params),
    queryFn: () => learningApi.getMyEnrollments(params),
  });

// Enroll mutation
export const useEnrollInCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnrollRequest) => learningApi.enrollInCourse(data),
    onSuccess: () => {
      // Invalidate both catalog (to update enrolled state) and my-enrollments
      queryClient.invalidateQueries({ queryKey: ['learner', 'my-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['learner', 'catalog'] });
    },
  });
};

// User certificates
export const useMyCertificates = () =>
  useQuery({
    queryKey: LEARNER_QUERY_KEYS.certificates,
    queryFn: learningApi.getMyCertificates,
  });

// Admin: extend per-learner due date
export const useExtendDueDate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, date }: { enrollmentId: number; date: string | null }) =>
      learningApi.extendDueDate(enrollmentId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learner', 'my-enrollments'] });
    },
  });
};

// Categories for filter dropdown
export const useCourseCategories = () =>
  useQuery({
    queryKey: LEARNER_QUERY_KEYS.categories,
    queryFn: () => courseApi.getCategories(),
  });

// Tags for filter
export const useCourseTags = () =>
  useQuery({
    queryKey: ['learner', 'tags'],
    queryFn: () => courseApi.getTags(),
  });