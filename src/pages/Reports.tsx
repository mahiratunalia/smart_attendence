// src/pages/Reports.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Download, Loader2, Search, Filter, Edit2, Save } from 'lucide-react';
import { format } from 'date-fns';

function toCsv(rows: Record<string, any>[]) {
  const colsSet = rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((k) => set.add(k));
    return set;
  }, new Set<string>());
  const cols = Array.from(colsSet);
  const esc = (v: any) => {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.map(esc).join(',');
  const body = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [err, setErr] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    courseId: 'all',
    studentName: '',
    startDate: '',
    endDate: ''
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    status: '',
    reason: ''
  });

  const load = async () => {
    setLoading(true);
    setErr('');
    const res = await api.getAttendanceRecords();
    setLoading(false);
    if (!res.success) return setErr(res.message || 'Failed to load attendance records');
    setRows(res.data || []);
  };

  useEffect(() => { 
    if (user) {
      fetchCourses();
      fetchStudents();
      load();
      fetchLeaveRequests();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      const res = await api.getUsers('student');
      if (res.success && res.data) setStudents(res.data);
      else setStudents([]);
    } catch {
      setStudents([]);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await api.getLeaveRequests();
      if (res.success && res.data) setLeaveRequests(res.data);
      else setLeaveRequests([]);
    } catch {
      setLeaveRequests([]);
    }
  };

  const fetchCourses = async () => {
    try {
      const result = await api.getCourses();
      if (result.success && result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const result = await api.getAttendanceRecords(filters);
      if (result.success && result.data) {
        setRows(result.data);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const qC = filters.courseId !== 'all' ? filters.courseId : '';
    const qS = filters.studentName.trim().toLowerCase();
    const dFrom = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
    const dTo = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;

    return rows.filter((r: any) => {
      const course = r?.lectureId?.courseId;
      const courseText = `${course?.name || ''} ${course?.code || ''}`.toLowerCase();
      const student = r?.studentId;
      const studentText = `${student?.name || ''} ${student?.email || ''} ${student?.studentId || ''}`.toLowerCase();

      const okC = qC ? courseText.includes(qC) : true;
      const okS = qS ? studentText.includes(qS) : true;

      const dt = r?.markedAt ? new Date(r.markedAt) : null;
      const okFrom = dFrom && dt ? dt >= dFrom : true;
      const okTo = dTo && dt ? dt <= dTo : true;

      return okC && okS && okFrom && okTo;
    });
  }, [rows, filters]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendance();
  };

  const exportCsv = () => {
    const flat = filtered.map((r: any) => ({
      courseCode: r?.lectureId?.courseId?.code || '',
      courseName: r?.lectureId?.courseId?.name || '',
      lectureId: r?.lectureId?._id || '',
      lectureDate: r?.lectureId?.date ? new Date(r.lectureId.date).toISOString().slice(0, 10) : '',
      studentId: r?.studentId?.studentId || '',
      studentName: r?.studentId?.name || '',
      studentEmail: r?.studentId?.email || '',
      status: r?.status || '',
      markedBy: r?.markedBy || '',
      markedAt: r?.markedAt ? new Date(r.markedAt).toISOString() : '',
      correctionReason: r?.correctionReason || '',
    }));

    downloadCsv(`attendance_report_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(flat));
  };

  const handleExportCSV = () => {
    setDownloading(true);
    try {
      const headers = ['Date', 'Time', 'Course', 'Lecture', 'Student Name', 'Student Email', 'Status', 'Marked By'];
      const rows = filtered.map(record => [
        format(new Date(record.createdAt), 'yyyy-MM-dd'),
        format(new Date(record.createdAt), 'HH:mm:ss'),
        record.lecture_id?.course_id?.name || 'Unknown',
        record.lecture_id?.title || 'Unknown',
        record.student_id?.name || 'Unknown',
        record.student_id?.email || 'Unknown',
        record.status,
        record.marked_by
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(item => `"${item}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export report');
    } finally {
      setDownloading(false);
    }
  };

  const openEditDialog = (record: any) => {
    setEditingRecord(record);
    setEditForm({
      status: record.status,
      reason: record.correction_reason || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!editingRecord) return;
    
    try {
      const result = await api.updateAttendance(editingRecord._id, editForm.status, editForm.reason);
      if (result.success) {
        toast.success('Attendance updated successfully');
        setRows(prev => prev.map(r => r._id === editingRecord._id ? result.data : r));
        setEditDialogOpen(false);
      } else {
        toast.error('Failed to update attendance');
      }
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Attendance Reports</h1>
          <p className="text-muted-foreground mt-1">View and export attendance records</p>
        </div>
        <Button onClick={handleExportCSV} disabled={downloading || rows.length === 0} className="gradient-primary">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="glass-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select 
                value={filters.courseId} 
                onValueChange={(value) => setFilters({...filters, courseId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course._id} value={course._id}>{course.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student Search</Label>
              <Input 
                placeholder="Name, Email, or ID" 
                value={filters.studentName}
                list="students-list"
                onChange={(e) => setFilters({...filters, studentName: e.target.value})}
              />
              <datalist id="students-list">
                {students.map((s) => (
                  <option key={s._id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input 
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>

            <Button type="submit" variant="secondary">
              <Search className="w-4 h-4 mr-2" /> Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No records found matching your filters</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marked By</TableHead>
                    {(user?.role === 'teacher' || user?.role === 'admin') && (
                      <TableHead className="text-right">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(record.createdAt), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(record.createdAt), 'hh:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{record.lecture_id?.course_id?.code}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {record.lecture_id?.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{record.student_id?.name}</span>
                          <span className="text-xs text-muted-foreground">{record.student_id?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                          {record.status}
                        </Badge>
                        {record.correction_reason && (
                           <span className="block text-[10px] text-muted-foreground mt-1">Edited</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{record.marked_by}</TableCell>
                      {(user?.role === 'teacher' || user?.role === 'admin') && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(record)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Leave Requests (Status)</CardTitle>
          <CardDescription>
            {user?.role === 'student'
              ? 'Your submitted leave requests and teacher responses'
              : 'Student leave requests and review status'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <div className="text-sm text-muted-foreground">No leave requests found.</div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    {(user?.role === 'teacher' || user?.role === 'admin') && <TableHead>Student</TableHead>}
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((lr: any) => (
                    <TableRow key={lr._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{lr.course_id?.code || '—'}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {lr.course_id?.name || 'Deleted/Unknown Course'}
                          </span>
                        </div>
                      </TableCell>
                      {(user?.role === 'teacher' || user?.role === 'admin') && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{lr.student_id?.name || '—'}</span>
                            <span className="text-xs text-muted-foreground">{lr.student_id?.email || ''}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {lr.from_date ? format(new Date(lr.from_date), 'MMM dd, yyyy') : '—'}
                        {' - '}
                        {lr.to_date ? format(new Date(lr.to_date), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={lr.status === 'approved' ? 'default' : lr.status === 'rejected' ? 'destructive' : 'secondary'}
                        >
                          {lr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate">
                        {lr.review_comment || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Correct Attendance</DialogTitle>
            <DialogDescription>
              Update status for {editingRecord?.student_id?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(value) => setEditForm({...editForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Reason for Correction</Label>
              <Input 
                value={editForm.reason}
                onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                placeholder="e.g. Student forgot to scan, medical excuse..."
              />
            </div>

            <Button onClick={handleUpdateStatus} className="w-full gradient-primary">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;