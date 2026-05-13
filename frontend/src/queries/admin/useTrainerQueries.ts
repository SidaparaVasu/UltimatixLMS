import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '@/api/course-api';
import { CourseTrainerWritePayload } from '@/types/courses.types';

export const TRAINER_KEYS = {
  trainers: (courseId: number) => ['trainers', courseId],
};

export const useTrainers = (courseId: number) =>
  useQuery({
    queryKey: TRAINER_KEYS.trainers(courseId),
    queryFn: () => courseApi.getTrainers(courseId),
    enabled: !!courseId,
    staleTime: 30_000,
  });

export const useAddTrainer = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CourseTrainerWritePayload) => courseApi.addTrainer(courseId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAINER_KEYS.trainers(courseId) }),
  });
};

export const useUpdateTrainer = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CourseTrainerWritePayload> }) =>
      courseApi.updateTrainer(courseId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAINER_KEYS.trainers(courseId) }),
  });
};

export const useRemoveTrainer = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseApi.removeTrainer(courseId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAINER_KEYS.trainers(courseId) }),
  });
};
