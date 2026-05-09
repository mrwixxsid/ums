import { GraduationCap, ToggleRight, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';

const ManagerLayout = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Slim sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">UniPortal</span>
            <span className="text-[10px] text-muted-foreground">Manager</span>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <NavLink
            to="/manager"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <ToggleRight className="h-4 w-4" />
            Feature Control
          </NavLink>
          <NavLink
            to="/manager/profile"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <User className="h-4 w-4" />
            Profile
          </NavLink>
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ManagerLayout;
