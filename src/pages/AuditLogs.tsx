import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';

type AuditFlag = {
  id: string;
  rule: string;
  title?: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  firstSeen: string;
  lastSeen: string;
  student?: { _id: string; name?: string; email?: string; studentId?: string };
  course?: { _id: string; name?: string; code?: string };
  recommendedFilters?: {
    courseId?: string;
    studentId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  };
  examContext?: {
    courseId: string;
    windowStart: string;
    windowEnd: string;
    titles?: string[];
  };
};

type Course = {
  _id: string;
  name: string;
  code?: string;
};

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

type AuditLog = {
  _id: string;
  actorId?: { _id: string; name?: string; email?: string } | string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
};

const AuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [userId, setUserId] = useState<string>('all');
  const [courseId, setCourseId] = useState<string>('all');
  const [action, setAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [studentIdForReview, setStudentIdForReview] = useState<string | undefined>(undefined);

  const filters = useMemo(() => {
    return {
      userId: userId !== 'all' ? userId : undefined,
      studentId: studentIdForReview,
      courseId: courseId !== 'all' ? courseId : undefined,
      action: action.trim() ? action.trim() : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
  }, [action, courseId, endDate, startDate, userId, studentIdForReview]);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, coursesRes] = await Promise.all([api.getUsers(), api.getCourses()]);
        setUsers((usersRes.success ? (usersRes.data || []) : []) as User[]);
        setCourses((coursesRes.success ? (coursesRes.data || []) : []) as Course[]);
      } catch {
        // no-op
      }
    })();
  }, []);

  const fetchFlags = async () => {
    setFlagsLoading(true);
    try {
      const res = await api.getAuditFlags();
      if (!res.success) {
        setFlags([]);
        return;
      }
      setFlags((res.data || []) as AuditFlag[]);
    } finally {
      setFlagsLoading(false);
    }
  };

  const fetchLogs = async (override?: {
    userId?: string;
    studentId?: string;
    courseId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(override || filters);
      if (!res.success) {
        toast.error(res.message || 'Failed to load audit logs');
        setRows([]);
        return;
      }
      setRows(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setUserId('all');
    setCourseId('all');
    setAction('');
    setStartDate('');
    setEndDate('');
    setStudentIdForReview(undefined);
  };

  const reviewFlag = (f: AuditFlag) => {
    const rf = f.recommendedFilters || {};
    const nextFilters = {
      courseId: rf.courseId,
      studentId: rf.studentId,
      action: rf.action || 'ATTENDANCE_UPDATE',
      startDate: rf.startDate ? String(rf.startDate).slice(0, 10) : undefined,
      endDate: rf.endDate ? String(rf.endDate).slice(0, 10) : undefined,
    };

    setUserId('all');
    setCourseId(nextFilters.courseId ? nextFilters.courseId : 'all');
    setAction(nextFilters.action || 'ATTENDANCE_UPDATE');
    setStartDate(nextFilters.startDate || '');
    setEndDate(nextFilters.endDate || '');
    setStudentIdForReview(nextFilters.studentId);

    // Fetch immediately using explicit filters (avoids stale state/closure).
    fetchLogs(nextFilters);
  };

  const severityLabel = (s: AuditFlag['severity']) => {
    if (s === 'high') return 'High';
    if (s === 'medium') return 'Medium';
    return 'Low';
  };

  const getActorLabel = (r: AuditLog) => {
    if (typeof r.actorId === 'object' && r.actorId) {
      return r.actorId.name || r.actorId.email || String(r.actorId._id);
    }
    return r.actorRole ? `(${r.actorRole})` : '—';
  };

  const getCourseLabel = (r: AuditLog) => {
    const cid = r.meta?.courseId || r.meta?.course_id;
    const cname = r.meta?.courseName || r.meta?.course_name;
    if (cname) return String(cname);
    if (!cid) return '—';
    const found = courses.find(c => String(c._id) === String(cid));
    return found ? `${found.name}${found.code ? ` (${found.code})` : ''}` : String(cid);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold">
          Audit <span className="gradient-text">Logs</span>
        </h1>
        <p className="text-muted-foreground mt-1">Filter logs by user, course, date, or action</p>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map(u => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}{c.code ? ` (${c.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Action</Label>
            <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. LECTURE_SESSION_START" />
          </div>

          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="flex items-end gap-3 md:col-span-3">
            <Button onClick={fetchLogs} disabled={loading} className="gradient-primary">
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearFilters();
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-heading font-bold text-lg">Suspicious Flags</h2>
            <p className="text-sm text-muted-foreground">
              Simple rules highlight unusual attendance edits for review.
            </p>
          </div>
          <Button variant="outline" onClick={fetchFlags} disabled={flagsLoading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Window</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading flags...
                  </TableCell>
                </TableRow>
              ) : flags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No flags found
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <span className="text-sm">{severityLabel(f.severity)}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{f.title || f.rule}</div>
                        <div className="text-xs text-muted-foreground font-mono">{f.rule}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {f.student?.name || f.student?.email || f.student?.studentId || f.student?._id || '—'}
                    </TableCell>
                    <TableCell>
                      {f.course?.name
                        ? `${f.course.name}${f.course.code ? ` (${f.course.code})` : ''}`
                        : f.course?._id || '—'}
                    </TableCell>
                    <TableCell>{f.count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(f.firstSeen).toLocaleDateString()} - {new Date(f.lastSeen).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="gradient-primary" onClick={() => reviewFlag(f)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No logs found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{getActorLabel(r)}</TableCell>
                    <TableCell>{r.actorRole || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.action}</TableCell>
                    <TableCell>{getCourseLabel(r)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.ipAddress || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
