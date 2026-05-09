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
import { GraduationCap, LayoutDashboard, BookOpen, ClipboardCheck, Calendar, FileText, BarChart3, Bell, SendHorizontal, PenLine, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';

const studentNavItems = [
  { title: 'Dashboard', url: '/student', icon: LayoutDashboard, end: true },
  { title: 'My Courses', url: '/student/courses', icon: BookOpen, visKey: 'vis_student_courses' },
  { title: 'Attendance', url: '/student/attendance', icon: ClipboardCheck, visKey: 'vis_student_attendance' },
  { title: 'Schedule', url: '/student/schedule', icon: Calendar, visKey: 'vis_student_schedule' },
  { title: 'Exams', url: '/student/exams', icon: FileText, visKey: 'vis_student_exams' },
  { title: 'Results', url: '/student/results', icon: BarChart3, visKey: 'vis_student_results' },
  { title: 'Assessments', url: '/student/assessments', icon: PenLine, visKey: 'vis_student_assessments' },
  { title: 'Final Results', url: '/student/final-results', icon: Award, visKey: 'vis_student_final_results' },
  { title: 'Notices', url: '/student/notices', icon: Bell, visKey: 'vis_student_notices' },
  { title: 'Requests', url: '/student/requests', icon: SendHorizontal, visKey: 'vis_student_requests' },
];

export function StudentSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isVisible } = useFeatureVisibility();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = studentNavItems.filter(
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
            <span className="text-[10px] text-sidebar-foreground/60 truncate">Student</span>
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
