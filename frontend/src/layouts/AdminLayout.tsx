import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Header } from '@/components/layout/Header';
import { Outlet } from 'react-router-dom';

export const AdminLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className={cn("app-shell", !isSidebarOpen && "sidebar-collapsed")}>
      {/* Sidebar Component */}
      <AdminSidebar />

      {/* TopNav Component */}
      <Header />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
