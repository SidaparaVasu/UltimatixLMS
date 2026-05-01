import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingApi } from '@/api/training-api';
import {
  TrainingPlanListParams,
  TrainingPlanItemListParams,
  TrainingApprovalListParams,
  TrainingCalendarListParams,
  TrainingSessionListParams,
  CreateTrainingPlanPayload,
  UpdateTrainingPlanPayload,
  CreateTrainingPlanItemPayload,
  CreateTrainingCalendarPayload,
  CreateTrainingSessionPayload,
  UpdateTrainingSessionPayload,
  CreateSessionTrainerPayload,
  CreateEnrollmentPayload,
  UpsertAttendancePayload,
  FinalizeApprovalPayload,
} from '@/types/training.types';

export const TRAINING_QUERY_KEYS = {
  plans:       (params?: TrainingPlanListParams)     => ['training', 'plans', params],
  plan:        (id: number)                          => ['training', 'plan', id],
  planItems:   (planId: number)                      => ['training', 'plan-items', planId],
  approvals:   (params?: TrainingApprovalListParams) => ['training', 'approvals', params],
  calendars:   (params?: TrainingCalendarListParams) => ['training', 'calendars', params],
  sessions:    (params?: TrainingSessionListParams)  => ['training', 'sessions', params],
  trainers:    (sessionId: number)                   => ['training', 'trainers', sessionId],
  enrollments: (sessionId: number)                   => ['training', 'enrollments', sessionId],
  attendance:  (sessionId: number)                   => ['training', 'attendance', sessionId],
};

// ── Plans ─────────────────────────────────────────────────────────────────

export const useTrainingPlans = (params?: TrainingPlanListParams) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.plans(params),
    queryFn:  () => trainingApi.getPlans(params),
    staleTime: 30_000,
  });

export const useTrainingPlan = (id: number | null) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.plan(id ?? 0),
    queryFn:  () => trainingApi.getPlan(id!),
    enabled:  !!id,
    staleTime: 30_000,
  });

export const useCreatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrainingPlanPayload) => trainingApi.createPlan(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'plans'] }),
  });
};

export const useUpdatePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTrainingPlanPayload }) =>
      trainingApi.updatePlan(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['training', 'plans'] });
      qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.plan(variables.id) });
    },
  });
};

export const useDeletePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trainingApi.deletePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'plans'] }),
  });
};

// ── Plan Items ────────────────────────────────────────────────────────────

export const useTrainingPlanItems = (planId: number) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.planItems(planId),
    queryFn:  () => trainingApi.getPlanItems({ training_plan: planId, page_size: 100 }),
    enabled:  !!planId,
    staleTime: 30_000,
  });

export const useCreatePlanItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrainingPlanItemPayload) => trainingApi.createPlanItem(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.planItems(variables.training_plan) });
      qc.invalidateQueries({ queryKey: ['training', 'plans'] }); // refreshes items_count
    },
  });
};

export const useDeletePlanItem = (planId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trainingApi.deletePlanItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.planItems(planId) });
      qc.invalidateQueries({ queryKey: ['training', 'plans'] });
    },
  });
};

// ── Plan Approvals ────────────────────────────────────────────────────────

export const useTrainingApprovals = (params?: TrainingApprovalListParams) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.approvals(params),
    queryFn:  () => trainingApi.getApprovals(params),
    staleTime: 30_000,
  });

export const useFinalizeApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FinalizeApprovalPayload }) =>
      trainingApi.finalizeApproval(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training', 'approvals'] });
      qc.invalidateQueries({ queryKey: ['training', 'plans'] });
    },
  });
};

// ── Calendars ─────────────────────────────────────────────────────────────

export const useTrainingCalendars = (params?: TrainingCalendarListParams) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.calendars(params),
    queryFn:  () => trainingApi.getCalendars(params),
    staleTime: 60_000,
  });

export const useCreateCalendar = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrainingCalendarPayload) => trainingApi.createCalendar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'calendars'] }),
  });
};

// ── Sessions ──────────────────────────────────────────────────────────────

export const useTrainingSessions = (params?: TrainingSessionListParams) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.sessions(params),
    queryFn:  () => trainingApi.getSessions(params),
    enabled:  !!params?.calendar,
    staleTime: 60_000,
  });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTrainingSessionPayload) => trainingApi.createSession(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'sessions'] }),
  });
};

export const useUpdateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTrainingSessionPayload }) =>
      trainingApi.updateSession(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'sessions'] }),
  });
};

export const useDeleteSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trainingApi.deleteSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'sessions'] }),
  });
};

// ── Session Trainers ──────────────────────────────────────────────────────

export const useSessionTrainers = (sessionId: number) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.trainers(sessionId),
    queryFn:  () => trainingApi.getSessionTrainers(sessionId),
    enabled:  !!sessionId,
  });

export const useCreateSessionTrainer = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSessionTrainerPayload) => trainingApi.createSessionTrainer(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.trainers(sessionId) }),
  });
};

export const useDeleteSessionTrainer = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trainingApi.deleteSessionTrainer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.trainers(sessionId) }),
  });
};

// ── Enrollments ───────────────────────────────────────────────────────────

export const useSessionEnrollments = (sessionId: number) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.enrollments(sessionId),
    queryFn:  () => trainingApi.getEnrollments(sessionId),
    enabled:  !!sessionId,
  });

export const useCreateEnrollment = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEnrollmentPayload) => trainingApi.createEnrollment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.enrollments(sessionId) });
      qc.invalidateQueries({ queryKey: ['training', 'sessions'] }); // refreshes current_enrollments count
    },
  });
};

// ── Attendance ────────────────────────────────────────────────────────────

export const useSessionAttendance = (sessionId: number) =>
  useQuery({
    queryKey: TRAINING_QUERY_KEYS.attendance(sessionId),
    queryFn:  () => trainingApi.getAttendance(sessionId),
    enabled:  !!sessionId,
  });

export const useBulkUpsertAttendance = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertAttendancePayload) => trainingApi.bulkUpsertAttendance(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAINING_QUERY_KEYS.attendance(sessionId) }),
  });
};
