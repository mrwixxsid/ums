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
import { GraduationCap, LayoutDashboard, BookOpen, ClipboardList, Calendar, PenLine, Bell, Inbox, FileBarChart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';

const teacherNavItems = [
  { title: 'Dashboard', url: '/teacher', icon: LayoutDashboard, end: true },
  { title: 'My Courses', url: '/teacher/courses', icon: BookOpen, visKey: 'vis_teacher_courses' },
  { title: 'Attendance', url: '/teacher/attendance', icon: ClipboardList, visKey: 'vis_teacher_attendance' },
  { title: 'Schedule', url: '/teacher/schedule', icon: Calendar, visKey: 'vis_teacher_schedule' },
  { title: 'Assessments', url: '/teacher/assessments', icon: PenLine, visKey: 'vis_teacher_assessments' },
  { title: 'Notes', url: '/teacher/notes', icon: Bell, visKey: 'vis_teacher_notes' },
  { title: 'Requests', url: '/teacher/requests', icon: Inbox, visKey: 'vis_teacher_requests' },
  { title: 'Exam Results', url: '/teacher/results', icon: FileBarChart, visKey: 'vis_teacher_results' },
];

export function TeacherSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isVisible } = useFeatureVisibility();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = teacherNavItems.filter(
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
            <span className="text-[10px] text-sidebar-foreground/60 truncate">Teacher</span>
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
