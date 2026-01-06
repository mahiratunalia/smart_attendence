import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Save, Check, X, Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Student {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  status: 'present' | 'absent' | 'late' | 'excused' | 'not_marked';
  recordId?: string;
}

interface AttendanceSheetProps {
  lectureId: string;
  courseId: string;
  onSave?: () => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ lectureId, courseId, onSave }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [lectureId, courseId]);

  useEffect(() => {
    const filtered = students.filter(
      s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (s.student_id && s.student_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('student_id, profiles!course_enrollments_student_id_fkey(id, name, email, student_id)')
        .eq('course_id', courseId);

      if (enrollError) throw enrollError;

      // Fetch existing attendance records
      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('lecture_id', lectureId);

      if (recordsError) throw recordsError;

      const recordMap = new Map(records?.map(r => [r.student_id, r]) || []);

      const studentList: Student[] = (enrollments || []).map(e => {
        const profile = e.profiles as any;
        const record = recordMap.get(profile.id);
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          student_id: profile.student_id,
          status: record ? (record.status as Student['status']) : 'not_marked',
          recordId: record?.id,
        };
      });

      setStudents(studentList);
      setFilteredStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: Student['status']) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, status } : s
    ));
    setHasChanges(true);
  };

  const markAllAs = (status: 'present' | 'absent') => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    try {
      const updates = students.filter(s => s.status !== 'not_marked');
      
      for (const student of updates) {
        if (student.recordId) {
          // Update existing record
          await supabase
            .from('attendance_records')
            .update({ status: student.status })
            .eq('id', student.recordId);
        } else {
          // Insert new record
          await supabase
            .from('attendance_records')
            .insert({
              lecture_id: lectureId,
              student_id: student.id,
              status: student.status,
              marked_by: 'manual',
            });
        }
      }

      toast.success('Attendance saved successfully');
      setHasChanges(false);
      onSave?.();
      fetchStudents(); // Refresh to get new record IDs
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: Student['status']) => {
    const config = {
      present: { label: 'Present', variant: 'default' as const, className: 'bg-success text-success-foreground' },
      absent: { label: 'Absent', variant: 'destructive' as const, className: '' },
      late: { label: 'Late', variant: 'secondary' as const, className: 'bg-warning text-warning-foreground' },
      excused: { label: 'Excused', variant: 'outline' as const, className: '' },
      not_marked: { label: 'Not Marked', variant: 'outline' as const, className: 'text-muted-foreground' },
    };
    const c = config[status];
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const stats = {
    total: students.length,
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    late: students.filter(s => s.status === 'late').length,
    excused: students.filter(s => s.status === 'excused').length,
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Manual Attendance
            </CardTitle>
            <CardDescription>
              Mark attendance for each student
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAllAs('present')} className="gap-1">
              <Check className="w-4 h-4" />
              All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAllAs('absent')} className="gap-1">
              <X className="w-4 h-4" />
              All Absent
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-3 rounded-xl bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </div>
          <div className="p-3 rounded-xl bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </div>
          <div className="p-3 rounded-xl bg-warning/10 text-center">
            <p className="text-2xl font-bold text-warning">{stats.late}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 text-center">
            <p className="text-2xl font-bold">{stats.excused}</p>
            <p className="text-xs text-muted-foreground">Excused</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No students found</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {student.student_id || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>
                      <Select
                        value={student.status}
                        onValueChange={(value: Student['status']) => updateStatus(student.id, value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">
                            <span className="flex items-center gap-2">
                              <Check className="w-3 h-3 text-success" />
                              Present
                            </span>
                          </SelectItem>
                          <SelectItem value="absent">
                            <span className="flex items-center gap-2">
                              <X className="w-3 h-3 text-destructive" />
                              Absent
                            </span>
                          </SelectItem>
                          <SelectItem value="late">
                            <span className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-warning" />
                              Late
                            </span>
                          </SelectItem>
                          <SelectItem value="excused">
                            <span className="flex items-center gap-2">
                              <FileText className="w-3 h-3" />
                              Excused
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            variant="hero" 
            onClick={saveAttendance} 
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Attendance
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceSheet;
