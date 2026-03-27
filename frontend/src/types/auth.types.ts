// ---------------------------------------------------------------------------
// Permission Scope Types
// ---------------------------------------------------------------------------

export interface PermissionScope {
  GLOBAL: boolean;
  COMPANY: number[];
  BUSINESS_UNIT: number[];
  DEPARTMENT: number[];
  SELF: boolean;
}

/**
 * Aggregated permissions map keyed by permission_code.
 */
export type UserPermissions = Record<string, PermissionScope>;

// ---------------------------------------------------------------------------
// Role Types
// ---------------------------------------------------------------------------

export interface UserRole {
  id: number;
  role: number;
  role_name: string;
  role_code: string;
  scope_type: 'GLOBAL' | 'COMPANY' | 'BUSINESS_UNIT' | 'DEPARTMENT' | 'SELF';
  scope_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// User Profile Types
// Mirrors AuthUserProfileSerializer from the backend.
// ---------------------------------------------------------------------------

export interface UserProfile {
  first_name: string;
  last_name: string;
  phone_number: string | null;
  profile_image_url: string | null;
  date_of_birth: string | null;
  gender: 'M' | 'F' | 'O' | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Core User Type
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_email_verified: boolean;
  email_verified_at: string | null;
  last_login: string | null;
  created_at: string;
  profile: UserProfile | null;
  roles: UserRole[];
  permissions: UserPermissions;
}

// ---------------------------------------------------------------------------
// API Request / Response Payloads
// ---------------------------------------------------------------------------

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface OtpLoginRequest {
  identifier: string;
}

export interface OtpLoginConfirmRequest {
  identifier: string;
  otp_code: string;
}

export interface EmailVerifyRequest {
  email: string;
  otp_code: string;
  purpose: "EMAIL_VERIFICATION";
}

export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  profile_image_url?: string;
  date_of_birth?: string;
  gender?: 'M' | 'F' | 'O';
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  otp_code: string;
  new_password: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}

// ---------------------------------------------------------------------------
// Zustand Auth Store State
// ---------------------------------------------------------------------------

export interface AuthState {
  // Data
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Computed
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, access: string, refresh: string) => void;
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
}
