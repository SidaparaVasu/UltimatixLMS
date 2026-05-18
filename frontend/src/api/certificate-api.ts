import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { PaginatedResponse } from "./organization-api";
import {
  CertificateRecord,
  CertificateAdminRecord,
  RevokeCertificatePayload,
  CertificateVerificationResult,
} from "@/types/certificate.types";

export const certificateApi = {
  // Admin: list all certificates with optional filters
  getCertificates: async (params?: {
    learner_name?: string;
    certificate_type?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    try {
      const response = await apiClient.get("/certificates/", { params });
      return handleApiResponse<PaginatedResponse<CertificateAdminRecord>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Learner: list own certificates
  getMyCertificates: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    try {
      const response = await apiClient.get("/certificates/my/", { params });
      return handleApiResponse<PaginatedResponse<CertificateRecord>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Download certificate PDF as a Blob (binary response — no envelope)
  downloadCertificate: async (id: number): Promise<Blob | null> => {
    try {
      const response = await apiClient.get(`/certificates/${id}/download/`, {
        responseType: "blob",
      });
      return response.data as Blob;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  // Admin: revoke a certificate
  revokeCertificate: async (id: number, payload: RevokeCertificatePayload) => {
    try {
      const response = await apiClient.post(`/certificates/${id}/revoke/`, payload);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Public: verify a certificate by its UUID (no auth required)
  verifyCertificate: async (certificateId: string) => {
    try {
      const response = await apiClient.get(`/certificates/verify/${certificateId}/`);
      return handleApiResponse<CertificateVerificationResult>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
