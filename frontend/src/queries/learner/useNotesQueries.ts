import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '@/api/course-api';
import { CourseNoteUpdatePayload } from '@/types/courses.types';

export const NOTES_KEYS = {
  notes: (enrollmentId: number) => ['notes', enrollmentId],
};

export const useNotes = (enrollmentId: number) =>
  useQuery({
    queryKey: NOTES_KEYS.notes(enrollmentId),
    queryFn: () => courseApi.getNotes(enrollmentId),
    enabled: !!enrollmentId,
    staleTime: 30_000,
  });

export const useCreateNote = (enrollmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { lesson_id?: number | null; note_text: string }) =>
      courseApi.createNote({ enrollment_id: enrollmentId, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEYS.notes(enrollmentId) }),
  });
};

export const useUpdateNote = (enrollmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CourseNoteUpdatePayload }) =>
      courseApi.updateNote(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEYS.notes(enrollmentId) }),
  });
};

export const useDeleteNote = (enrollmentId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => courseApi.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEYS.notes(enrollmentId) }),
  });
};
