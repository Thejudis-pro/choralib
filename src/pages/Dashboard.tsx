import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AdminDashboard from './AdminDashboard';
import MemberDashboard from './MemberDashboard';

const Dashboard = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [showProfileFallback, setShowProfileFallback] = useState(false);
  const [retryingProfile, setRetryingProfile] = useState(false);

  useEffect(() => {
    if (!loading && user && !profile) {
      const timeoutId = window.setTimeout(() => {
        setShowProfileFallback(true);
      }, 2000);

      return () => window.clearTimeout(timeoutId);
    }

    setShowProfileFallback(false);
  }, [loading, user, profile]);

  const handleRetryProfile = async () => {
    if (!user) return;

    setRetryingProfile(true);
    setShowProfileFallback(false);

    const resolvedProfile = await refreshProfile(user);

    if (!resolvedProfile) {
      setShowProfileFallback(true);
    }

    setRetryingProfile(false);
  };

  if (loading || retryingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    if (!showProfileFallback) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm space-y-4">
          <h1 className="text-xl font-semibold">Unable to load your profile</h1>
          <p className="text-sm text-muted-foreground">Please retry. If this continues, sign out and sign in again.</p>
          <div className="flex justify-center gap-2">
            <Button onClick={handleRetryProfile}>Retry</Button>
            <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  return <MemberDashboard />;
};

export default Dashboard;