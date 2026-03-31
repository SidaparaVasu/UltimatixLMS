import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ColorTheme = 'orange' | 'blue';
export type ColorMode = 'light' | 'dark';

interface ThemeState {
  colorTheme: ColorTheme;
  mode: ColorMode;
  setColorTheme: (theme: ColorTheme) => void;
  setMode: (mode: ColorMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme: 'orange',
      mode: 'light',

      setColorTheme: (colorTheme) => {
        set({ colorTheme });
        document.documentElement.setAttribute('data-theme', colorTheme);
      },

      setMode: (mode) => {
        set({ mode });
        document.documentElement.setAttribute('data-mode', mode);
      },
    }),
    {
      name: 'lms_theme',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        colorTheme: state.colorTheme,
        mode: state.mode,
      }),
    }
  )
);
