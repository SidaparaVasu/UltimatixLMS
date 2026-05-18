import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { certificateApi } from '@/api/certificate-api';
import { RenewCertificatePayload, RevokeCertificatePayload } from '@/types/certificate.types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const CERTIFICATE_QUERY_KEYS = {
  certificates: {
    all:    () => ['admin', 'certificates'] as const,
    list:   (filters?: object) => ['admin', 'certificates', 'list', filters] as const,
    detail: (id: number)       => ['admin', 'certificates', 'detail', id] as const,
  },
  myCertificates: {
    list: (filters?: object) => ['learner', 'my-certificates', 'list', filters] as const,
  },
};

// ── Query hooks ───────────────────────────────────────────────────────────────

/** Admin: paginated list of issued certificates with optional filters. */
export const useAdminCertificates = (params?: {
  learner_name?: string;
  certificate_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) =>
  useQuery({
    queryKey: CERTIFICATE_QUERY_KEYS.certificates.list(params),
    queryFn:  () => certificateApi.getCertificates(params),
    staleTime: 30_000,
  });

// ── Mutation hooks ────────────────────────────────────────────────────────────

/** Admin: revoke an issued certificate. Invalidates all certificate list variants. */
export const useRevokeCertificate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RevokeCertificatePayload }) =>
      certificateApi.revokeCertificate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CERTIFICATE_QUERY_KEYS.certificates.all() });
    },
  });
};

/** Admin: renew an expired certificate. Invalidates all certificate list variants. */
export const useRenewCertificate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RenewCertificatePayload }) =>
      certificateApi.renewCertificate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CERTIFICATE_QUERY_KEYS.certificates.all() });
    },
  });
};
