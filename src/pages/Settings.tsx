import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 animate-slide-up">
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Account and app settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 animate-slide-up stagger-2">
          <h2 className="font-heading font-bold text-lg mb-4">Account</h2>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-muted/40">
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-medium">{user?.name || '—'}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/40">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-medium">{user?.email || '—'}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/40">
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="font-medium">{user?.role || '—'}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="outline" onClick={() => navigate('/profile')}>Go to Profile</Button>
            <Button
              variant="destructive"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {user?.role === 'admin' && (
            <div className="glass-card rounded-2xl p-6 animate-slide-up stagger-3">
              <h2 className="font-heading font-bold text-lg mb-4">Admin</h2>
              <div className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => navigate('/users')}>
                  Manage Users
                </Button>
                <Button className="w-full" variant="outline" onClick={() => navigate('/audit-logs')}>
                  Audit Logs
                </Button>
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 animate-slide-up stagger-4">
            <h2 className="font-heading font-bold text-lg mb-2">About</h2>
            <div className="text-sm text-muted-foreground">
              This page shows your account details and shortcuts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
