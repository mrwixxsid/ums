import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, GraduationCap, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { label: 'Home', path: '/home' },
  { label: 'Departments', path: '/departments' },
  { label: 'Faculty', path: '/faculty' },
  { label: 'Notices', path: '/notices-public' },
  { label: 'Exam Schedule', path: '/exam-schedule' },
  { label: 'Leadership', path: '/leadership' },
];

const roleDashboardMap: Record<string, string> = {
  super_admin: '/admin',
  teacher: '/teacher',
  student: '/student',
};

const PublicNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, role } = useAuth();

  const dashboardPath = role ? roleDashboardMap[role] : null;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-card/95 backdrop-blur-lg shadow-sm'
          : 'border-b border-transparent bg-card/80 backdrop-blur-sm'
      }`}
    >
      <div className="container mx-auto flex h-[72px] items-center justify-between px-4">
        <Link to="/home" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <span className="block text-base font-bold text-foreground tracking-wide">Gono Bishwabidyalay</span>
            <span className="block text-[11px] font-medium text-gold">A University with a Difference</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`relative px-3 py-2 text-sm font-medium transition-colors hover:text-foreground ${
                location.pathname === l.path
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {l.label}
              {location.pathname === l.path && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gold" />
              )}
            </Link>
          ))}
          {user && dashboardPath ? (
            <Button asChild size="sm" variant="outline" className="ml-3 gap-1.5 border-gold/30 text-gold hover:bg-gold/10">
              <Link to={dashboardPath}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-3 gold-gradient text-gold-foreground border-0 hover:opacity-90 shadow-md">
              <Link to="/login">Login</Link>
            </Button>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="border-t border-border bg-card px-4 pb-4 pt-2 lg:hidden animate-fade-in-up">
          {navLinks.map((l, i) => (
            <Link
              key={l.path}
              to={l.path}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent ${
                location.pathname === l.path ? 'text-foreground bg-gold/5 border-l-2 border-gold' : 'text-muted-foreground'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {l.label}
            </Link>
          ))}
          {user && dashboardPath ? (
            <Button asChild size="sm" variant="outline" className="mt-2 w-full gap-1.5 border-gold/30">
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="mt-2 w-full gold-gradient text-gold-foreground border-0">
              <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
            </Button>
          )}
        </nav>
      )}
    </header>
  );
};

export default PublicNavbar;
