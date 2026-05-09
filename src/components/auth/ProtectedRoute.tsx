import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ENABLE_MANAGER_ROLE } from '@/lib/featureFlags';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('super_admin' | 'manager' | 'teacher' | 'student')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated but role hasn't loaded yet — keep showing spinner
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'super_admin') return <Navigate to="/admin" replace />;
    if (ENABLE_MANAGER_ROLE && role === 'manager') return <Navigate to="/manager" replace />;
    if (role === 'teacher') return <Navigate to="/teacher" replace />;
    if (role === 'student') return <Navigate to="/student" replace />;
    // If manager role is disabled and user has manager role, send to pending
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
