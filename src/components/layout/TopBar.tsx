import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut, User, GraduationCap } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { ENABLE_MANAGER_ROLE } from '@/lib/featureFlags';

const TopBar = ({ title }: { title?: string }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';
  const roleBadge = role === 'super_admin' ? 'Super Admin'
    : role === 'teacher' ? 'Teacher'
    : (ENABLE_MANAGER_ROLE && role === 'manager') ? 'Manager'
    : 'Student';
  const profilePath = role === 'super_admin' ? '/admin/profile'
    : role === 'teacher' ? '/teacher/profile'
    : (ENABLE_MANAGER_ROLE && role === 'manager') ? '/manager/profile'
    : '/student/profile';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        {title && <h2 className="text-base font-semibold text-foreground hidden sm:block">{title}</h2>}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          <span className="text-xs font-medium text-primary">{roleBadge}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{roleBadge}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(profilePath)}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
