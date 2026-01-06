import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Calendar, AlertTriangle, TrendingUp, BookOpen, Clock, CheckSquare, MessageSquare, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    overallAttendance: 85,
    coursesEnrolled: 0,
    upcomingLectures: 0,
    atRiskCourses: 0,
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState([
    { date: 'Mon', attendance: 85 },
    { date: 'Tue', attendance: 90 },
    { date: 'Wed', attendance: 88 },
    { date: 'Thu', attendance: 92 },
    { date: 'Fri', attendance: 87 },
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch courses
      const coursesResult = await api.getCourses();
      if (coursesResult.success && coursesResult.data) {
        setCourses(coursesResult.data);
        setStats(prev => ({
          ...prev,
          coursesEnrolled: coursesResult.data.length,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">
          Hello, <span className="gradient-text">{user?.name}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your attendance and upcoming classes.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Attendance</p>
                <p className="text-3xl font-bold mt-2">{stats.overallAttendance}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Courses Enrolled</p>
                <p className="text-3xl font-bold mt-2">{stats.coursesEnrolled}</p>
              </div>
              <BookOpen className="w-10 h-10 text-secondary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Lectures</p>
                <p className="text-3xl font-bold mt-2">{stats.upcomingLectures}</p>
              </div>
              <Calendar className="w-10 h-10 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At Risk Courses</p>
                <p className="text-3xl font-bold text-destructive mt-2">{stats.atRiskCourses}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Attendance Trend</CardTitle>
          <CardDescription>Last 5 days attendance percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Enrolled Courses */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Your Courses</CardTitle>
          <CardDescription>Courses you are currently enrolled in</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No courses enrolled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course._id} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">{course.code}</p>
                    </div>
                    <Badge variant="outline">{course.section}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="glass-card hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/attendance')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mark Attendance</h3>
              <p className="text-sm text-muted-foreground">Scan QR or enter code</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/schedule')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">View Schedule</h3>
              <p className="text-sm text-muted-foreground">Check upcoming classes</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Courses', icon: BookOpen, path: '/courses' },
          { label: 'Resources', icon: FileText, path: '/resources' },
          { label: 'Messages', icon: MessageSquare, path: '/messages' },
          { label: 'Leave Requests', icon: FileText, path: '/leave-requests' },
        ].map((item, i) => (
          <Button key={i} variant="outline" className="h-auto py-6 flex flex-col gap-2" onClick={() => navigate(item.path)}>
            <item.icon className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StudentDashboard;