import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import TopBar from '@/components/layout/TopBar';

const StudentLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar />
        <SidebarInset className="flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default StudentLayout;
