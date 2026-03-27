/**
 * Zustand global store for authentication state.
 *
 * Rules:
 * - Stores: authenticated user, tokens (UI/session state only).
 * - Must NOT store server data (use React Query for that).
 * - Uses `persist` middleware to survive page refreshes.
 * - Token storage is delegated to axios-client helpers for consistency.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setTokens, clearTokens } from '@/api/axios-client';
import type { AuthState, User } from '@/types/auth.types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ---------------------------------------------------------------------------
      // State
      // ---------------------------------------------------------------------------
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // ---------------------------------------------------------------------------
      // Actions
      // ---------------------------------------------------------------------------

      /**
       * setAuth — called after a successful login or OTP confirmation.
       * Saves user data and tokens in the store and in localStorage.
       */
      setAuth: (user: User, access: string, refresh: string) => {
        setTokens(access, refresh);
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        });
      },

      /**
       * setUser — updates user object independently (e.g., after profile PATCH).
       */
      setUser: (user: User) => {
        set({ user });
      },

      /**
       * setTokens — updates tokens independently (e.g., after silent refresh).
       */
      setTokens: (access: string, refresh: string) => {
        setTokens(access, refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      /**
       * clearAuth — full logout: clears state and removes tokens from storage.
       */
      clearAuth: () => {
        clearTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'lms_auth', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist user and token values, not action functions
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
