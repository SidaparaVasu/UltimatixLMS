import { useQuery } from '@tanstack/react-query';
import { certificateApi } from '@/api/certificate-api';
import { CERTIFICATE_QUERY_KEYS } from '@/queries/admin/useCertificateQueries';

export { CERTIFICATE_QUERY_KEYS } from '@/queries/admin/useCertificateQueries';

/**
 * Learner hook — own certificates, optionally filtered by status or paginated.
 * Used by the My Certificates page.
 */
export const useMyCertificates = (params?: {
  status?: string;
  page?: number;
  page_size?: number;
}) =>
  useQuery({
    queryKey: CERTIFICATE_QUERY_KEYS.myCertificates.list(params),
    queryFn:  () => certificateApi.getMyCertificates(params),
    staleTime: 30_000,
  });
