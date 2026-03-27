import { apiClient } from './axios-client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  ProfileUpdateRequest,
  UserProfile,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  TokenRefreshRequest,
  TokenRefreshResponse,
  OtpLoginConfirmRequest,
  EmailVerifyRequest,
} from '@/types/auth.types';

const AUTH_BASE = '/auth';

// ---------------------------------------------------------------------------
// Registration & Login
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * POST /auth/register/
   */
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const res = await apiClient.post(`${AUTH_BASE}/register/`, payload);
    return res.data.data;
  },

  /**
   * POST /auth/login/
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
   */
  requestOtpLogin: async (identifier: string): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/login/otp/request/`, { identifier });
  },

  /**
   * POST /auth/login/otp/confirm/
   */
  confirmOtpLogin: async (payload: OtpLoginConfirmRequest): Promise<LoginResponse> => {
    const res = await apiClient.post(`${AUTH_BASE}/login/otp/confirm/`, payload);
    return res.data.data;
  },

  /**
   * POST /auth/otp/verify/  — email verification after registration
   */
  verifyEmail: async (payload: EmailVerifyRequest): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/otp/verify/`, payload);
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
   * POST /auth/otp/send/  — generic OTP request
   */
  requestOtp: async (email: string, purpose: 'EMAIL_VERIFICATION' | 'LOGIN' | 'PASSWORD_RESET'): Promise<void> => {
    await apiClient.post(`${AUTH_BASE}/otp/send/`, { email, purpose });
  },

  /**
   * DELETE /auth/sessions/:id/
   * Revokes a specific session by its ID.
   */
  revokeSession: async (sessionId: number): Promise<void> => {
    await apiClient.delete(`${AUTH_BASE}/sessions/${sessionId}/`);
  },
};
