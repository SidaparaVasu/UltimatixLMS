import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Outlet } from 'react-router-dom';

export const DashboardLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Component */}
      <Sidebar />

      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* Header Component */}
        <Header />

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-screen-2xl">
            {/* Main Content Area */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
