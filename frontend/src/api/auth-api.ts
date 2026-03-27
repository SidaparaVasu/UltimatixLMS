/**
 * auth-api.ts
 *
 * Centralized service for all backend auth_security endpoints.
 * Prefixed under: /api/v1/auth/
 *
 * Rules:
 * - All calls go through apiClient (Axios instance).
 * - No business logic here — only HTTP communication.
 * - Returns typed response data extracted from the standard wrapper.
 */

import { apiClient } from './axios-client';
import type {
  LoginRequest,
  LoginResponse,
  User,
  ProfileUpdateRequest,
  UserProfile,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  TokenRefreshRequest,
  TokenRefreshResponse,
} from '@/types/auth.types';

const AUTH_BASE = '/auth';

// ---------------------------------------------------------------------------
// Registration & Login
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * POST /auth/login/
   * Authenticates user with email/username + password.
   */
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const res = await apiClient.post(`${AUTH_BASE}/login/`, payload);
    return res.data.data;
  },

  /**
   * POST /auth/logout/
   * Invalidates the current session. Requires refresh token in body.
   */
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/logout/`, { refresh: refreshToken });
  },

  /**
   * POST /auth/token/refresh/
   * Obtains a new access token using the refresh token.
   */
  refreshToken: async (payload: TokenRefreshRequest): Promise<TokenRefreshResponse> => {
    const res = await apiClient.post(`${AUTH_BASE}/token/refresh/`, payload);
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // OTP Login
  // ---------------------------------------------------------------------------

  /**
   * POST /auth/login/otp/request/
   * Sends a login OTP to the user's email/phone.
   */
  requestOtpLogin: async (identifier: string): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/login/otp/request/`, { identifier });
  },

  /**
   * POST /auth/login/otp/confirm/
   * Confirms OTP-based login and returns tokens.
   */
  confirmOtpLogin: async (identifier: string, otp_code: string): Promise<LoginResponse> => {
    const res = await apiClient.post(`${AUTH_BASE}/login/otp/confirm/`, { identifier, otp_code });
    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  /**
   * GET /auth/profile/
   * Returns the full authenticated user profile with roles and permissions.
   */
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get(`${AUTH_BASE}/profile/`);
    return res.data.data;
  },

  /**
   * PATCH /auth/profile/
   * Updates the authenticated user's profile fields.
   */
  updateProfile: async (payload: ProfileUpdateRequest): Promise<UserProfile> => {
    const res = await apiClient.patch(`${AUTH_BASE}/profile/`, payload);
    return res.data.data;
  },

  // ---------------------------------------------------------------------------
  // Password Management
  // ---------------------------------------------------------------------------

  /**
   * POST /auth/password/change/
   * Changes the current user's password (must be authenticated).
   */
  changePassword: async (payload: PasswordChangeRequest): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/password/change/`, payload);
  },

  /**
   * POST /auth/password/reset/ (Step 1)
   * Requests a password reset OTP to the user's email.
   */
  requestPasswordReset: async (payload: PasswordResetRequest): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/password/reset/`, payload);
  },

  /**
   * POST /auth/password/reset/confirm/ (Step 2)
   * Confirms the password reset with OTP and sets the new password.
   */
  confirmPasswordReset: async (payload: PasswordResetConfirmRequest): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/password/reset/confirm/`, payload);
  },

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------

  /**
   * GET /auth/sessions/
   * Lists all active sessions for the authenticated user.
   */
  getSessions: async (): Promise<unknown[]> => {
    const res = await apiClient.get(`${AUTH_BASE}/sessions/`);
    return res.data.data;
  },

  /**
   * DELETE /auth/sessions/:id/
   * Revokes a specific session by its ID.
   */
  revokeSession: async (sessionId: number): Promise<void> => {
    await apiClient.delete(`${AUTH_BASE}/sessions/${sessionId}/`);
  },
};
