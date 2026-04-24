import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Outlet } from 'react-router-dom';

export const AdminLayout = () => {
  const { isSidebarOpen } = useUIStore();

  return (
    <div className={cn("app-shell", !isSidebarOpen && "sidebar-collapsed")}>
      <Sidebar />
      <Header />
      <main className="main-content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
