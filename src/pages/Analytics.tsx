import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Loader2, TrendingUp, TrendingDown, Users, Calendar, AlertTriangle, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';

interface CourseStats {
  id: string;
  name: string;
  code: string;
  totalLectures: number;
  totalStudents: number;
  avgAttendance: number;
  atRiskStudents: number;
}

interface TrendData {
  date: string;
  attendance: number;
  present: number;
  absent: number;
}

interface StudentAtRisk {
  id: string;
  name: string;
  email: string;
  studentId: string;
  courseName: string;
  attendancePercent: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [studentsAtRisk, setStudentsAtRisk] = useState<StudentAtRisk[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    totalLectures: 0,
    atRiskCount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, selectedCourse]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch courses for teacher
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user.id);

      if (coursesError) throw coursesError;

      const courseStats: CourseStats[] = [];
      const allStudentsAtRisk: StudentAtRisk[] = [];
      let totalStudentsCount = 0;
      let totalAttendanceSum = 0;
      let totalLecturesCount = 0;

      for (const course of coursesData || []) {
        // Get enrollments for this course
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('student_id, profiles!course_enrollments_student_id_fkey(id, name, email, student_id)')
          .eq('course_id', course.id);

        // Get lectures for this course
        const { data: lectures } = await supabase
          .from('lectures')
          .select('id, date')
          .eq('course_id', course.id);

        const studentCount = enrollments?.length || 0;
        const lectureCount = lectures?.length || 0;
        totalStudentsCount += studentCount;
        totalLecturesCount += lectureCount;

        // Calculate attendance for each student
        let courseAttendanceSum = 0;
        let atRiskCount = 0;

        for (const enrollment of enrollments || []) {
          const { data: attendanceRecords } = await supabase
            .from('attendance_records')
            .select('status, lecture_id')
            .eq('student_id', enrollment.student_id)
            .in('lecture_id', lectures?.map(l => l.id) || []);

          const presentCount = attendanceRecords?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
          const attendancePercent = lectureCount > 0 ? (presentCount / lectureCount) * 100 : 100;
          courseAttendanceSum += attendancePercent;

          if (attendancePercent < 80 && lectureCount > 0) {
            atRiskCount++;
            const profile = enrollment.profiles as any;
            allStudentsAtRisk.push({
              id: enrollment.student_id,
              name: profile?.name || 'Unknown',
              email: profile?.email || '',
              studentId: profile?.student_id || '',
              courseName: course.name,
              attendancePercent: Math.round(attendancePercent),
            });
          }
        }

        const avgAttendance = studentCount > 0 ? courseAttendanceSum / studentCount : 0;
        totalAttendanceSum += avgAttendance;

        courseStats.push({
          id: course.id,
          name: course.name,
          code: course.code,
          totalLectures: lectureCount,
          totalStudents: studentCount,
          avgAttendance: Math.round(avgAttendance),
          atRiskStudents: atRiskCount,
        });
      }

      setCourses(courseStats);
      setStudentsAtRisk(allStudentsAtRisk);
      setOverallStats({
        totalStudents: totalStudentsCount,
        avgAttendance: courseStats.length > 0 ? Math.round(totalAttendanceSum / courseStats.length) : 0,
        totalLectures: totalLecturesCount,
        atRiskCount: allStudentsAtRisk.length,
      });

      // Fetch trend data for last 14 days
      await fetchTrendData(coursesData?.map(c => c.id) || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrendData = async (courseIds: string[]) => {
    const trends: TrendData[] = [];
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date(),
    });

    for (const day of last14Days) {
      const dateStr = format(day, 'yyyy-MM-dd');

      const { data: lectures } = await supabase
        .from('lectures')
        .select('id')
        .in('course_id', courseIds)
        .eq('date', dateStr);

      if (lectures && lectures.length > 0) {
        const lectureIds = lectures.map(l => l.id);

        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('status')
          .in('lecture_id', lectureIds);

        const presentCount = attendance?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
        const absentCount = attendance?.filter(a => a.status === 'absent').length || 0;
        const total = presentCount + absentCount;

        trends.push({
          date: format(day, 'MMM dd'),
          attendance: total > 0 ? Math.round((presentCount / total) * 100) : 0,
          present: presentCount,
          absent: absentCount,
        });
      } else {
        trends.push({
          date: format(day, 'MMM dd'),
          attendance: 0,
          present: 0,
          absent: 0,
        });
      }
    }

    setTrendData(trends);
  };

  const sendAlertEmail = async (student: StudentAtRisk) => {
    try {
      const { error } = await supabase.functions.invoke('send-attendance-alert', {
        body: {
          studentEmail: student.email,
          studentName: student.name,
          courseName: student.courseName,
          attendancePercent: student.attendancePercent,
        },
      });

      if (error) throw error;
      alert(`Alert sent to ${student.email}`);
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('Failed to send alert. Email service may not be configured.');
    }
  };

  const pieData = courses.map((course, index) => ({
    name: course.code,
    value: course.avgAttendance,
    fill: COLORS[index % COLORS.length],
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold gradient-text">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track attendance trends and identify at-risk students</p>
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold">{overallStats.totalStudents}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-3xl font-bold">{overallStats.avgAttendance}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-chart-1/10 flex items-center justify-center">
                  {overallStats.avgAttendance >= 80 ? (
                    <TrendingUp className="w-6 h-6 text-chart-1" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Lectures</p>
                  <p className="text-3xl font-bold">{overallStats.totalLectures}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-chart-2/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">At Risk Students</p>
                  <p className="text-3xl font-bold text-destructive">{overallStats.atRiskCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="glass-card">
            <TabsTrigger value="trends">Attendance Trends</TabsTrigger>
            <TabsTrigger value="comparison">Course Comparison</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Attendance Trends (Last 14 Days)</CardTitle>
                <CardDescription>Daily attendance percentage across all courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-muted-foreground" />
                      <YAxis domain={[0, 100]} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--primary))' }}
                        name="Attendance %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Course Comparison</CardTitle>
                <CardDescription>Compare attendance rates across different courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courses}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="code" className="text-muted-foreground" />
                      <YAxis domain={[0, 100]} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="avgAttendance" fill="hsl(var(--primary))" name="Avg Attendance %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalStudents" fill="hsl(var(--chart-2))" name="Total Students" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>Distribution of attendance across courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* At Risk Students */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Students At Risk (Below 80% Attendance)
            </CardTitle>
            <CardDescription>Students who may need intervention due to low attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {studentsAtRisk.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No students are currently at risk. Great job!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentsAtRisk.map((student) => (
                  <div
                    key={`${student.id}-${student.courseName}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-destructive">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.studentId} • {student.courseName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        {student.attendancePercent}%
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendAlertEmail(student)}
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Send Alert
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Analytics;
