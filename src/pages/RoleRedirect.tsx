import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ENABLE_MANAGER_ROLE } from '@/lib/featureFlags';

const RoleRedirect = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (role === 'super_admin') navigate('/admin', { replace: true });
    else if (ENABLE_MANAGER_ROLE && role === 'manager') navigate('/manager', { replace: true });
    else if (role === 'teacher') navigate('/teacher', { replace: true });
    else if (role === 'student') navigate('/student', { replace: true });
    else navigate('/pending', { replace: true });
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default RoleRedirect;
