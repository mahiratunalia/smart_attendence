import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  Bell,
  GraduationCap,
  BookOpen,
  Calendar,
  BarChart3,
  MessageSquare,
  FileText,
  Shield,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getNavLinks = () => {
    if (!user) return [];

    const commonLinks = [
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    ];

    switch (user.role) {
      case 'student':
        return [
          ...commonLinks,
          { to: '/attendance', label: 'Attendance', icon: GraduationCap },
          { to: '/courses', label: 'Courses', icon: BookOpen },
          { to: '/calendar', label: 'Calendar', icon: Calendar },
          { to: '/resources', label: 'Resources', icon: FileText },
          { to: '/messages', label: 'Messages', icon: MessageSquare },
        ];
      case 'teacher':
        return [
          ...commonLinks,
          { to: '/lectures', label: 'Lectures', icon: GraduationCap },
          { to: '/courses', label: 'Courses', icon: BookOpen },
          { to: '/resources', label: 'Resources', icon: FileText },
          { to: '/reports', label: 'Reports', icon: BarChart3 },
          { to: '/messages', label: 'Messages', icon: MessageSquare },
        ];
      case 'admin':
        return [
          ...commonLinks,
          { to: '/users', label: 'Users', icon: Users },
          { to: '/courses', label: 'Courses', icon: BookOpen },
          { to: '/reports', label: 'Reports', icon: BarChart3 },
          { to: '/audit-logs', label: 'Audit Logs', icon: Shield },
        ];
      case 'parent':
        return [
          ...commonLinks,
          { to: '/child-attendance', label: 'Attendance', icon: GraduationCap },
        ];
      default:
        return commonLinks;
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl gradient-text hidden sm:block">
              SmartAttend
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'nav-link flex items-center gap-2 text-sm font-medium',
                      isActive 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative" asChild>
                  <a href="/notifications">
                    <Bell className="w-5 h-5" />
                  </a>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 px-2">
                      <div className="w-8 h-8 rounded-full gradient-secondary flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                      <span className="hidden md:block text-sm font-medium">
                        {user?.name?.split(' ')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 glass-card">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user?.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Toggle */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-slide-down">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isActive 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
