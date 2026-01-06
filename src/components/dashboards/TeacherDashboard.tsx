import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Users,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  ArrowRight,
  Presentation,
  Megaphone,
  Loader2,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

type DashboardResource = {
  _id: string;
  title: string;
  type: string;
  file_url?: string;
  file_name?: string;
  course_id?: { _id: string; code: string; name: string } | string;
  average_rating?: number;
  rating_count?: number;
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeLectures: 0,
    totalCourses: 0,
    totalStudents: 0,
    nextLecture: null as any
  });
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [resourcesByCourse, setResourcesByCourse] = useState<Record<string, DashboardResource[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [lecturesRes, coursesRes, resourcesRes] = await Promise.all([
          api.getLectures(),
          api.getCourses(),
          api.getResources()
        ]);

        let activeLectures = 0;
        let nextLecture = null;
        let totalCourses = 0;
        let totalStudents = 0;

        if (lecturesRes.success) {
          const lectures = lecturesRes.data || [];
          activeLectures = lectures.filter((l: any) => l.status === 'active').length;
          
          const upcoming = lectures
            .filter((l: any) => l.status === 'scheduled' && new Date(l.date).getTime() >= new Date().setHours(0,0,0,0))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          if (upcoming.length > 0) nextLecture = upcoming[0];
        }

        if (coursesRes.success) {
          const courses = (coursesRes.data || []).filter((c: any) => 
            c.teacherId === user?.id || c.teacherId?._id === user?.id
          );
          setMyCourses(courses);
          totalCourses = courses.length;
          const studentSet = new Set();
          courses.forEach((c: any) => {
            if (c.students) {
              c.students.forEach((s: any) => studentSet.add(typeof s === 'string' ? s : s._id));
            }
          });
          totalStudents = studentSet.size;

          if (resourcesRes.success) {
            const teacherCourseIds = new Set(courses.map((c: any) => c._id));
            const allResources: DashboardResource[] = resourcesRes.data || [];
            const filtered = allResources.filter((r: any) => {
              const courseId = typeof r.course_id === 'string' ? r.course_id : r.course_id?._id;
              return courseId && teacherCourseIds.has(courseId);
            });
            const grouped: Record<string, DashboardResource[]> = {};
            for (const r of filtered) {
              const courseId = typeof r.course_id === 'string' ? r.course_id : r.course_id?._id;
              if (!courseId) continue;
              if (!grouped[courseId]) grouped[courseId] = [];
              grouped[courseId].push(r);
            }
            // Keep a stable order: newest first if timestamps exist, otherwise as-is.
            for (const k of Object.keys(grouped)) {
              grouped[k] = grouped[k].slice(0, 3);
            }
            setResourcesByCourse(grouped);
          }
        }

        setStats({ activeLectures, totalCourses, totalStudents, nextLecture });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold">
          Welcome back, <span className="gradient-text">{user?.name}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening in your classes today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Presentation className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Lectures</p>
              <h3 className="text-2xl font-bold">{stats.activeLectures}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Courses</p>
              <h3 className="text-2xl font-bold">{stats.totalCourses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <h3 className="text-2xl font-bold">{stats.totalStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/messages')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Send Message</p>
              <h3 className="text-lg font-bold">Click Here</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {stats.nextLecture ? (
            <Card className="glass-card border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-lg">Up Next</CardTitle>
                <CardDescription>Your next scheduled lecture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{stats.nextLecture.title}</h3>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {stats.nextLecture.course_id?.code} - {stats.nextLecture.course_id?.name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(stats.nextLecture.date), 'EEEE, MMM do')}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {stats.nextLecture.startTime} - {stats.nextLecture.endTime}
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/lectures')} className="gradient-primary">
                    Go to Lecture <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No upcoming lectures scheduled.</p>
                <Button variant="link" onClick={() => navigate('/schedule')}>View Schedule</Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50" onClick={() => navigate('/reports')}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="font-semibold">View Reports</span>
              <span className="text-xs text-muted-foreground">Attendance analytics</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50" onClick={() => navigate('/courses')}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-semibold">My Courses</span>
              <span className="text-xs text-muted-foreground">Manage enrollments</span>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/lectures')}>
                <Presentation className="w-4 h-4 mr-2" /> Manage Lectures
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/courses')}>
                <BookOpen className="w-4 h-4 mr-2" /> My Courses
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/reports')}>
                <TrendingUp className="w-4 h-4 mr-2" /> Reports
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/leave-requests')}>
                <MessageSquare className="w-4 h-4 mr-2" /> Leave Requests
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Course Resources</CardTitle>
              <CardDescription>Quick access to resources you shared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {myCourses.length === 0 ? (
                <div className="text-sm text-muted-foreground">No courses found.</div>
              ) : (
                myCourses.map((c: any) => {
                  const list = resourcesByCourse[c._id] || [];

                  const openResource = async (r: DashboardResource) => {
                    if (!r.file_url) return;
                    await api.incrementResourceView(r._id);
                    if (r.type === 'link' || r.file_url.startsWith('http')) {
                      window.open(r.file_url, '_blank');
                      return;
                    }
                    await api.downloadResource(r.file_url, r.file_name || 'download');
                  };

                  return (
                    <div key={c._id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{c.code} - {c.name}</div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/resources')}>
                          View All
                        </Button>
                      </div>
                      {list.length === 0 ? (
                        <div className="text-xs text-muted-foreground mt-2">No resources yet.</div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {list.map((r) => (
                            <Button
                              key={r._id}
                              variant="link"
                              className="h-auto p-0 justify-start text-left"
                              onClick={() => openResource(r)}
                            >
                              <span className="flex items-center justify-between gap-3 w-full">
                                <span className="truncate">{r.title}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {typeof r.average_rating === 'number' ? `${r.average_rating.toFixed(1)} (${r.rating_count || 0})` : ''}
                                </span>
                              </span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;