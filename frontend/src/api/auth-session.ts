/**
 * Coordinates hard logout when refresh fails (avoids login ↔ dashboard reload loops).
 */

import { clearTokens } from './token-storage';

type LogoutHandler = () => void;

let logoutHandler: LogoutHandler = () => {
  clearTokens();
};

let redirectInProgress = false;

export function registerAuthLogoutHandler(handler: LogoutHandler): void {
  logoutHandler = handler;
}

/** Clears tokens + auth store; redirects to login at most once per burst. */
export function forceAuthLogout(): void {
  logoutHandler();
  if (redirectInProgress) return;
  if (window.location.pathname.startsWith('/login')) return;
  redirectInProgress = true;
  window.location.replace('/login');
}

/** Call after a successful login so a later 401 can redirect again. */
export function resetAuthLogoutRedirectGuard(): void {
  redirectInProgress = false;
}
