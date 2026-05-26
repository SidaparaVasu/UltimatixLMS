/**
 * Token persistence helpers (no axios dependency).
 * Shared by axios-client and authStore to avoid circular imports.
 */

export const TOKEN_KEYS = {
  ACCESS: 'lms_access_token',
  REFRESH: 'lms_refresh_token',
} as const;

export const getAccessToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.ACCESS);

export const getRefreshToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.REFRESH);

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem(TOKEN_KEYS.ACCESS, access);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refresh);
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
};
