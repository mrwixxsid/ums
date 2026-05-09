import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock } from 'lucide-react';

const PendingPage = () => {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-2xl">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Account Pending</h1>
        <p className="text-muted-foreground">
          Your account has been created. Please wait for an administrator to assign you a role before you can access the portal.
        </p>
        <p className="text-sm text-muted-foreground">Signed in as <strong>{user?.email}</strong></p>
        <Button onClick={signOut} variant="outline">Sign Out</Button>
      </div>
    </div>
  );
};

export default PendingPage;
