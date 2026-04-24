import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DashboardView = 'employee' | 'manager' | 'admin';

interface UIState {
  isSidebarOpen: boolean;
  activeDashboardView: DashboardView;
  toggleSidebar: () => void;
  setSidebar: (isOpen: boolean) => void;
  setDashboardView: (view: DashboardView) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      activeDashboardView: 'employee',
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebar: (isOpen) => set({ isSidebarOpen: isOpen }),
      setDashboardView: (view) => set({ activeDashboardView: view }),
    }),
    {
      name: 'lms_ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        activeDashboardView: state.activeDashboardView,
      }),
    }
  )
);
