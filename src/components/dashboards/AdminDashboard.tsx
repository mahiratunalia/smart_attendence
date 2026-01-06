import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  FileText,
  Settings,
  UserPlus,
  GraduationCap,
  Bell,
  Mail,
  Megaphone
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  avgAttendance: number;
  atRiskStudents: number;
  totalDepartments: number;
}

interface DepartmentStat {
  id: string;
  name: string;
  studentCount: number;
  avgAttendance: number;
}

type UserSummary = {
  _id: string;
  id?: string;
  name?: string;
  email?: string;
  role?: 'student' | 'teacher' | 'admin' | string;
  departmentId?: string;
};

type ResourceSummary = {
  _id: string;
  title?: string;
  course_id?: { _id: string; name?: string; code?: string } | string;
  uploaded_by?: { _id: string; name?: string; email?: string } | string;
  average_rating?: number;
  rating_count?: number;
  view_count?: number;
};

type RankedResource = {
  id: string;
  title: string;
  courseLabel: string;
  uploaderLabel: string;
  avgRating: number;
  ratingCount: number;
  views: number;
};

type RankedPerson = {
  id: string;
  name: string;
  email: string;
  resourcesShared: number;
  totalRatings: number;
  avgRating: number;
};

type Department = {
  _id: string;
  name: string;
  code: string;
};

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    avgAttendance: 0,
    atRiskStudents: 0,
    totalDepartments: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [topResources, setTopResources] = useState<RankedResource[]>([]);
  const [topStudents, setTopStudents] = useState<RankedPerson[]>([]);
  const [topTeachers, setTopTeachers] = useState<RankedPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, coursesRes, departmentsRes, attendanceRes, resourcesRes] = await Promise.all([
        api.getUsers(),
        api.getCourses(),
        api.getDepartments(),
        api.getAttendanceRecords(),
        api.getResources(),
      ]);

      const users: UserSummary[] = usersRes.success ? (usersRes.data || []) : [];
      const courses = coursesRes.success ? (coursesRes.data || []) : [];
      const departments: Department[] = departmentsRes.success ? (departmentsRes.data || []) : [];
      const attendance = attendanceRes.success ? (attendanceRes.data || []) : [];
      const resources: ResourceSummary[] = resourcesRes.success ? (resourcesRes.data || []) : [];

      const totalStudents = users.filter(u => u.role === 'student').length;
      const totalTeachers = users.filter(u => u.role === 'teacher').length;
      const totalCourses = courses.length;
      const totalDepartments = departments.length;

      const totalAttendance = attendance.length;
      const attended = attendance.filter((r: any) => r.status && r.status !== 'absent').length;
      const avgAttendance = totalAttendance ? (attended / totalAttendance) * 100 : 0;

      const perStudent = new Map<string, { attended: number; total: number }>();
      for (const r of attendance) {
        const sid = String(r.student_id?._id || r.student_id || '');
        if (!sid) continue;
        const row = perStudent.get(sid) || { attended: 0, total: 0 };
        row.total += 1;
        if (r.status && r.status !== 'absent') row.attended += 1;
        perStudent.set(sid, row);
      }
      const atRiskStudents = Array.from(perStudent.values()).filter(v => v.total > 0 && (v.attended / v.total) < 0.75).length;

      setStats({
        totalStudents,
        totalTeachers,
        totalCourses,
        avgAttendance,
        atRiskStudents,
        totalDepartments,
      });

      // ---------------- Resource-Based Rankings ----------------
      const roleByUserId = new Map<string, string>();
      for (const u of users) {
        if (!u?._id) continue;
        roleByUserId.set(String(u._id), String(u.role || ''));
      }

      const resolvedResources: RankedResource[] = resources.map((r) => {
        const courseObj: any = r.course_id && typeof r.course_id === 'object' ? r.course_id : null;
        const uploaderObj: any = r.uploaded_by && typeof r.uploaded_by === 'object' ? r.uploaded_by : null;

        const courseLabel = courseObj
          ? `${courseObj.name || 'Course'}${courseObj.code ? ` (${courseObj.code})` : ''}`
          : '—';

        const uploaderLabel = uploaderObj?.name || uploaderObj?.email || '—';

        return {
          id: String(r._id),
          title: r.title || 'Untitled',
          courseLabel,
          uploaderLabel,
          avgRating: Number(r.average_rating || 0),
          ratingCount: Number(r.rating_count || 0),
          views: Number(r.view_count || 0),
        };
      });

      const ratedResources = resolvedResources.filter((r) => r.ratingCount > 0);
      const sortedTopResources = [...ratedResources]
        .sort((a, b) => {
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
          if (b.views !== a.views) return b.views - a.views;
          return a.title.localeCompare(b.title);
        })
        .slice(0, 5);
      setTopResources(sortedTopResources);

      type Agg = {
        id: string;
        name: string;
        email: string;
        role: string;
        resourcesShared: number;
        totalRatings: number;
        weightedStarsSum: number;
      };

      const aggByUserId = new Map<string, Agg>();
      for (const r of resources) {
        const uploaderObj: any = r.uploaded_by && typeof r.uploaded_by === 'object' ? r.uploaded_by : null;
        const uploaderId = String(uploaderObj?._id || (typeof r.uploaded_by === 'string' ? r.uploaded_by : ''));
        if (!uploaderId) continue;

        const ratingCount = Number(r.rating_count || 0);
        const avgRating = Number(r.average_rating || 0);

        const existing = aggByUserId.get(uploaderId);
        if (existing) {
          existing.resourcesShared += 1;
          existing.totalRatings += ratingCount;
          existing.weightedStarsSum += avgRating * ratingCount;
        } else {
          const role = roleByUserId.get(uploaderId) || '';
          aggByUserId.set(uploaderId, {
            id: uploaderId,
            name: String(uploaderObj?.name || 'Unknown'),
            email: String(uploaderObj?.email || ''),
            role,
            resourcesShared: 1,
            totalRatings: ratingCount,
            weightedStarsSum: avgRating * ratingCount,
          });
        }
      }

      const rankedPeople: RankedPerson[] = Array.from(aggByUserId.values())
        .map((a) => {
          const avg = a.totalRatings > 0 ? a.weightedStarsSum / a.totalRatings : 0;
          return {
            id: a.id,
            name: a.name,
            email: a.email,
            resourcesShared: a.resourcesShared,
            totalRatings: a.totalRatings,
            avgRating: avg,
          };
        })
        .filter((p) => p.totalRatings > 0);

      const sortPeople = (a: RankedPerson, b: RankedPerson) => {
        if (b.totalRatings !== a.totalRatings) return b.totalRatings - a.totalRatings;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.resourcesShared !== a.resourcesShared) return b.resourcesShared - a.resourcesShared;
        return a.name.localeCompare(b.name);
      };

      const topStudentsRanked = rankedPeople
        .filter((p) => (roleByUserId.get(p.id) || '') === 'student')
        .sort(sortPeople)
        .slice(0, 5);
      setTopStudents(topStudentsRanked);

      const topTeachersRanked = rankedPeople
        .filter((p) => (roleByUserId.get(p.id) || '') === 'teacher')
        .sort(sortPeople)
        .slice(0, 5);
      setTopTeachers(topTeachersRanked);

      const studentsByDept = new Map<string, string[]>();
      for (const u of users) {
        if (u.role !== 'student') continue;
        const deptId = u.departmentId ? String(u.departmentId) : '';
        if (!deptId) continue;
        const list = studentsByDept.get(deptId) || [];
        list.push(String(u._id || u.id));
        studentsByDept.set(deptId, list);
      }

      const deptStats: DepartmentStat[] = departments.map((d) => {
        const studentIds = studentsByDept.get(String(d._id)) || [];
        const studentSet = new Set(studentIds);
        let deptTotal = 0;
        let deptAttended = 0;
        for (const r of attendance) {
          const sid = String(r.student_id?._id || r.student_id || '');
          if (!sid || !studentSet.has(sid)) continue;
          deptTotal += 1;
          if (r.status && r.status !== 'absent') deptAttended += 1;
        }
        const deptAvg = deptTotal ? (deptAttended / deptTotal) * 100 : 0;
        return {
          id: d._id,
          name: `${d.name} (${d.code})`,
          studentCount: studentIds.length,
          avgAttendance: deptAvg,
        };
      });

      setDepartmentStats(deptStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-success bg-success/10';
      case 'warning': return 'text-warning bg-warning/10';
      case 'error': return 'text-destructive bg-destructive/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="font-heading text-3xl font-bold">
          Admin <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mt-1">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'gradient-primary' },
          { label: 'Total Teachers', value: stats.totalTeachers, icon: Users, color: 'gradient-secondary' },
          { label: 'Active Courses', value: stats.totalCourses, icon: BookOpen, color: 'gradient-accent' },
          { label: 'Avg Attendance', value: `${stats.avgAttendance.toFixed(1)}%`, icon: BarChart3, color: 'bg-success' },
          { label: 'At-Risk Students', value: stats.atRiskStudents, icon: AlertTriangle, color: 'bg-warning' },
          { label: 'Departments', value: stats.totalDepartments, icon: Calendar, color: 'bg-muted' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className="stat-card animate-slide-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="text-2xl font-heading font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Department Overview */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 animate-slide-up stagger-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading font-bold text-xl">Department Overview</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/users')}>
              View All
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : departmentStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No departments configured yet</p>
              <Button className="mt-4" onClick={() => navigate('/users')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Departments
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {departmentStats.map((dept, i) => (
                <div key={dept.id} className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      <p className="text-sm text-muted-foreground">{dept.studentCount} students</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        dept.avgAttendance >= 85 ? 'text-success' : 
                        dept.avgAttendance >= 75 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {dept.avgAttendance.toFixed(1)}%
                      </span>
                      {dept.avgAttendance >= 80 ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        dept.avgAttendance >= 85 ? 'gradient-secondary' : 
                        dept.avgAttendance >= 75 ? 'bg-warning' : 'bg-destructive'
                      }`}
                      style={{ width: `${dept.avgAttendance}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 animate-slide-up stagger-3">
            <h2 className="font-heading font-bold text-lg mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: UserPlus, label: 'Manage Users', color: 'gradient-primary', path: '/users' },
                { icon: BookOpen, label: 'Courses', color: 'gradient-secondary', path: '/courses' },
                { icon: FileText, label: 'Reports', color: 'gradient-accent', path: '/reports' },
                { icon: Settings, label: 'Settings', color: 'bg-muted', path: '/settings' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className="p-4 rounded-xl hover:shadow-card transition-all flex flex-col items-center gap-2 bg-muted/50 hover:bg-muted"
                >
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audit Alerts */}
          <div className="glass-card rounded-2xl p-6 animate-slide-up stagger-4">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-lg">System Alerts</h2>
            </div>
            
            <div className="space-y-3">
              {stats.atRiskStudents > 0 && (
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-sm font-medium">Low Attendance Alert</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.atRiskStudents} students below attendance threshold
                  </p>
                </div>
              )}
              
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Email Alerts Active</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Parents will receive alerts for low attendance
                </p>
              </div>
            </div>
          </div>

          {/* Send Bulk Alert */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/messages')}
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Manage Announcements
          </Button>
        </div>
      </div>

      {/* Rankings */}
      <div className="mt-8 glass-card rounded-2xl p-6 animate-slide-up stagger-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-xl">Rankings</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-muted/30">
            <h3 className="font-semibold mb-3">Top-rated resources</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : topResources.length === 0 ? (
              <div className="text-sm text-muted-foreground">No rated resources yet</div>
            ) : (
              <div className="rounded-xl bg-background/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Course</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topResources.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{r.courseLabel}</TableCell>
                        <TableCell className="text-right">{r.views}</TableCell>
                        <TableCell className="text-right">
                          {r.avgRating.toFixed(1)} ({r.ratingCount})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/30">
            <h3 className="font-semibold mb-3">Top students</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : topStudents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No student ratings yet</div>
            ) : (
              <div className="rounded-xl bg-background/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Resources</TableHead>
                      <TableHead className="text-right">Ratings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStudents.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.email || '—'}</div>
                        </TableCell>
                        <TableCell className="text-right">{p.resourcesShared}</TableCell>
                        <TableCell className="text-right">{p.avgRating.toFixed(1)} ({p.totalRatings})</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/30">
            <h3 className="font-semibold mb-3">Top teachers</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : topTeachers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No teacher ratings yet</div>
            ) : (
              <div className="rounded-xl bg-background/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">Resources</TableHead>
                      <TableHead className="text-right">Ratings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTeachers.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.email || '—'}</div>
                        </TableCell>
                        <TableCell className="text-right">{p.resourcesShared}</TableCell>
                        <TableCell className="text-right">{p.avgRating.toFixed(1)} ({p.totalRatings})</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
