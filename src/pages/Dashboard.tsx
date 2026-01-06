import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// Layout is provided by App.tsx
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'student':
        return <StudentDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'parent':
        return (
          <div className="p-8 text-center text-muted-foreground">
            Parent Dashboard is under construction
          </div>
        );
      default:
        return (
          <div className="p-8 text-center text-muted-foreground">
            Unknown User Role: {user.role}
          </div>
        );
    }
  };

  return <>{renderDashboard()}</>;
};

export default Dashboard;
