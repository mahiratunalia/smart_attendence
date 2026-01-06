import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Settings,
  LogOut,
  Megaphone,
  Presentation,
  BarChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const links = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CheckSquare, label: 'Attendance', path: '/attendance' },
    
    // Lectures: Teachers only
    ...(user?.role === 'teacher' ? [{ icon: Presentation, label: 'Lectures', path: '/lectures' }] : []),
    
    { icon: BookOpen, label: 'Courses', path: '/courses' },
    { icon: Calendar, label: 'Schedule', path: '/schedule' },
    { icon: BookOpen, label: 'Resources', path: '/resources' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: FileText, label: 'Leave Requests', path: '/leave-requests' },
    { icon: BarChart, label: 'Reports', path: '/reports' },
  ];

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-border">
        <h1 className="font-heading text-2xl font-bold gradient-text">SmartAttend</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
