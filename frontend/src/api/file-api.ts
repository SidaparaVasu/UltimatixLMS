import { apiClient } from "./axios-client";
import { handleApiError, handleApiResponse } from "@/utils/api-utils";

export interface UploadedFile {
  id: string;           // UUID — FileRegistry.id is a UUIDField
  original_name: string;
  file_url?: string | null;
  file_type: string;
  size_bytes: number;
  upload_status: string;
  created_at: string;
}

export const fileApi = {
  uploadFile: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/files/files/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return handleApiResponse<UploadedFile>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Requests a short-lived signed token for secure file access.
   * POST /api/v1/files/files/request-token/
   */
  requestFileToken: async (fileRefId: string): Promise<string | null> => {
    try {
      const response = await apiClient.post("/files/files/request-token/", {
        file_ref: fileRefId,
      });
      const data = handleApiResponse<{ token: string; expires_in: number }>(
        response.data,
        false,
      );
      return data?.token ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Triggers a browser download for a file-backed resource using the secure
   * token endpoint with ?download=true.
   */
  downloadResource: async (fileRefId: string, filename: string): Promise<void> => {
    const token = await fileApi.requestFileToken(fileRefId);
    if (!token) return;
    // Build the serve URL — the backend will set Content-Disposition: attachment
    const url = `/api/v1/files/resources/${encodeURIComponent(token)}/?download=true`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
