import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { GraduationCap, LayoutDashboard, Building2, Users, GraduationCap as StudentIcon, BookOpen, Bell, Calendar, FileText, BarChart3, Settings, DoorOpen, CalendarClock, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';

const adminNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, end: true },
  { title: 'Departments', url: '/admin/departments', icon: Building2, visKey: 'vis_admin_departments' },
  { title: 'Teachers', url: '/admin/teachers', icon: Users, visKey: 'vis_admin_teachers' },
  { title: 'Students', url: '/admin/students', icon: StudentIcon, visKey: 'vis_admin_students' },
  { title: 'Batches', url: '/admin/batches', icon: Layers, visKey: 'vis_admin_batches' },
  { title: 'Courses', url: '/admin/courses', icon: BookOpen, visKey: 'vis_admin_courses' },
  { title: 'Rooms', url: '/admin/rooms', icon: DoorOpen, visKey: 'vis_admin_rooms' },
  { title: 'Routine', url: '/admin/routine', icon: CalendarClock, visKey: 'vis_admin_routine' },
  { title: 'Notices', url: '/admin/notices', icon: Bell, visKey: 'vis_admin_notices' },
  { title: 'Schedule', url: '/admin/schedule', icon: Calendar, visKey: 'vis_admin_schedule' },
  { title: 'Exams', url: '/admin/exams', icon: FileText, visKey: 'vis_admin_exams' },
  { title: 'Results', url: '/admin/results', icon: BarChart3, visKey: 'vis_admin_results' },
  { title: 'Settings', url: '/admin/settings', icon: Settings, visKey: 'vis_admin_settings' },
  
];

export function AdminSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isVisible, loading } = useFeatureVisibility();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = adminNavItems.filter(
    (item) => !item.visKey || isVisible(item.visKey)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="shrink-0 w-7 h-7 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-sidebar-primary truncate">UniPortal</span>
            <span className="text-[10px] text-sidebar-foreground/60 truncate">Super Admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent rounded-md"
                      activeClassName="text-sidebar-primary bg-sidebar-accent font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sign out" className="text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
