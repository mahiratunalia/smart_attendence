import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  QrCode, 
  Shield, 
  Bell, 
  BarChart3, 
  Users, 
  FileText, 
  Calendar,
  ChevronRight,
  Star,
  Zap,
  Clock,
  Award
} from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Dynamic QR Attendance',
    description: 'Secure, proxy-resistant attendance with auto-refreshing QR codes every 30 seconds',
  },
  {
    icon: Shield,
    title: 'Time-Window Control',
    description: 'Attendance accepted only within first 10 minutes - no more late or proxy marking',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Comprehensive dashboards with attendance trends, at-risk alerts, and exportable reports',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Never miss a class with automated reminders for lectures, assignments, and more',
  },
  {
    icon: FileText,
    title: 'Resource Management',
    description: 'Upload, share, and rate lecture materials with integrated course resources',
  },
  {
    icon: Calendar,
    title: 'Dynamic Calendar',
    description: 'Unified view of lectures, exams, holidays with attendance status integration',
  },
];

const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '50K+', label: 'Students' },
  { value: '500+', label: 'Institutions' },
  { value: '98%', label: 'Satisfaction' },
];

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen mesh-background overflow-hidden">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full gradient-primary opacity-10 blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full gradient-secondary opacity-10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full gradient-accent opacity-10 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-slide-up">
            <Zap className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">Revolutionizing Academic Attendance</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up stagger-1">
            Smart Attendance &<br />
            <span className="gradient-text">Lecture Companion</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up stagger-2">
            A comprehensive MERN-stack solution for proxy-resistant attendance, 
            lecture resource management, and academic engagement tracking.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-slide-up stagger-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/login">
                Sign In
              </Link>
            </Button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-2xl glass-card max-w-md mx-auto animate-slide-up stagger-4">
            <p className="text-sm text-muted-foreground mb-2">Demo Credentials:</p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary font-mono">student@demo.com</span>
              <span className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary font-mono">teacher@demo.com</span>
              <span className="px-2 py-1 rounded-lg bg-accent/10 text-accent font-mono">admin@demo.com</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Password: demo123</p>
          </div>

          {/* Hero Image/Visual */}
          <div className="relative mt-16 animate-slide-up stagger-5">
            <div className="relative mx-auto max-w-4xl rounded-3xl glass-card p-2 shadow-card-hover">
              <div className="rounded-2xl bg-card p-8 overflow-hidden">
                {/* Mock Dashboard Preview */}
                <div className="grid grid-cols-4 gap-4">
                  {/* Stats Cards */}
                  {[
                    { label: 'Overall Attendance', value: '94.5%', color: 'gradient-primary', icon: BarChart3 },
                    { label: 'Courses Enrolled', value: '6', color: 'gradient-secondary', icon: GraduationCap },
                    { label: 'Current Streak', value: '12 days', color: 'gradient-accent', icon: Award },
                    { label: 'Pending Tasks', value: '3', color: 'bg-warning', icon: Clock },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/50">
                      <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                        <stat.icon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                
                {/* QR Code Preview */}
                <div className="mt-6 p-6 rounded-xl bg-muted/30 flex items-center gap-6">
                  <div className="w-32 h-32 rounded-2xl gradient-primary flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-lg">CSE470 - Software Engineering</h3>
                    <p className="text-sm text-muted-foreground">Active Lecture Session</p>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-success" />
                        <span className="text-sm">Refreshes in 28s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm">24/30 marked</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl gradient-secondary flex items-center justify-center shadow-card animate-float">
              <Star className="w-10 h-10 text-secondary-foreground" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-xl gradient-accent flex items-center justify-center shadow-card animate-float" style={{ animationDelay: '1s' }}>
              <Bell className="w-8 h-8 text-accent-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="text-center p-6 rounded-2xl glass-card floating-card animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className="text-3xl md:text-4xl font-heading font-bold gradient-text">{stat.value}</p>
                <p className="text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for<br />
              <span className="gradient-text">Modern Education</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to manage attendance, engage students, and track academic progress
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="p-6 rounded-2xl glass-card floating-card group animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Designed for Everyone
            </h2>
            <p className="text-muted-foreground">Four distinct user roles with tailored experiences</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { role: 'Student', icon: GraduationCap, color: 'gradient-primary', features: ['Mark attendance via QR', 'View attendance stats', 'Access resources', 'Request leaves'] },
              { role: 'Teacher', icon: Users, color: 'gradient-secondary', features: ['Start lectures', 'Generate QR codes', 'Upload resources', 'View reports'] },
              { role: 'Admin', icon: Shield, color: 'gradient-accent', features: ['Manage users', 'View audit logs', 'System analytics', 'Course management'] },
              { role: 'Parent', icon: Users, color: 'bg-warning', features: ['View child attendance', 'Get alerts', 'Track progress', 'Simple dashboard'] },
            ].map((item, i) => (
              <div 
                key={i} 
                className="p-6 rounded-2xl glass-card floating-card animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-heading font-bold text-xl mb-4">{item.role}</h3>
                <ul className="space-y-2">
                  {item.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="relative rounded-3xl gradient-hero p-12 text-center overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-32 h-32 border border-primary-foreground/20 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Transform Your Attendance System?
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
                Join hundreds of institutions using SmartAttend to streamline 
                attendance and boost student engagement.
              </p>
              <Button variant="glass" size="xl" asChild>
                <Link to="/register">
                  Start Free Trial
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl">SmartAttend</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Smart Attendance & Lecture Companion. CSE470 Project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
