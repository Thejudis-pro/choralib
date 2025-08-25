import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import MemberDashboard from './MemberDashboard';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Route to appropriate dashboard based on user role
  if (profile?.role === 'admin') {
    // Check if admin has active subscription for big library access
    if (!profile.subscription_active) {
      return <Navigate to="/pricing" replace />;
    }
    return <AdminDashboard />;
  } else {
    return <MemberDashboard />;
  }
};

export default Dashboard;