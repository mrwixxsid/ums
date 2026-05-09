import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Eye, EyeOff, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ENABLE_MANAGER_ROLE } from '@/lib/featureFlags';

const BASE_DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'me@mrwixxsid.com', password: '123456', color: 'bg-red-500/20 hover:bg-red-500/30 text-red-100 border-red-500/30' },
  { label: 'Teacher (Roena)', email: 'roena.afroz@university.edu', password: '123456', color: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-500/30' },
  { label: 'Teacher (Atikur)', email: 'atikur.rahman@university.edu', password: '123456', color: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 border-purple-500/30' },
  { label: 'Student 223', email: 'student223@university.edu', password: 'Demo@1234', color: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border-emerald-500/30' },
];

// Manager demo credential only included when ENABLE_MANAGER_ROLE is true
const MANAGER_DEMO = { label: 'Manager (Imran)', email: 'imranmahmud.dev@gmail.com', password: '123456', color: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border-amber-500/30' };

const DEMO_ACCOUNTS = ENABLE_MANAGER_ROLE
  ? [...BASE_DEMO_ACCOUNTS, MANAGER_DEMO]
  : BASE_DEMO_ACCOUNTS;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, role } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
      return;
    }
    toast.success('Welcome back!');
    navigate('/portal');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(221,83%,10%)] via-[hsl(221,70%,16%)] to-[hsl(221,60%,22%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-2">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">University Portal</h1>
          <p className="text-white/60 text-sm">Academic Management System</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                Forgot your password?
              </Link>
            </div>
            <div className="mt-2 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Quick-Login — hidden in production builds */}
        {import.meta.env.DEV && (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">Quick Demo Login</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(account => (
              <button
                key={account.email}
                type="button"
                onClick={() => { setEmail(account.email); setPassword(account.password); toast.info(`Credentials filled for ${account.label}`); }}
                className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${account.color}`}
              >
                {account.label}
              </button>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-2 text-center">Click a role to fill credentials, then Sign In</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
