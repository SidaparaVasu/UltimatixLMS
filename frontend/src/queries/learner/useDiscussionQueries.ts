import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '@/api/course-api';

export const DISCUSSION_KEYS = {
  threads: (courseId: number) => ['discussion', 'threads', courseId],
};

export const useDiscussionThreads = (courseId: number) =>
  useQuery({
    queryKey: DISCUSSION_KEYS.threads(courseId),
    queryFn: () => courseApi.getDiscussionThreads(courseId),
    enabled: !!courseId,
    staleTime: 30_000,
  });

export const useCreateThread = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { thread_title: string; thread_body: string }) =>
      courseApi.createDiscussionThread({ course: courseId, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCUSSION_KEYS.threads(courseId) }),
  });
};

export const useCreateReply = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { thread: number; reply_text: string }) =>
      courseApi.createDiscussionReply(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCUSSION_KEYS.threads(courseId) }),
  });
};

export const useDeleteThread = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseApi.deleteDiscussionThread(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCUSSION_KEYS.threads(courseId) }),
  });
};

export const useDeleteReply = (courseId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseApi.deleteDiscussionReply(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISCUSSION_KEYS.threads(courseId) }),
  });
};
