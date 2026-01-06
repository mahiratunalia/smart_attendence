// src/pages/Lectures.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Play, Square, RefreshCw, Clock, Users, QrCode, BookOpen, Edit2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

interface Lecture {
  _id: string;
  title: string;
  course_id: {
    _id: string;
    name: string;
    code: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  activeClassCode?: string;
  activeQrCode?: string;
  sessionStartTime?: string;
}

const Lectures: React.FC = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(''); // Changed default from 'all' to empty string
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    status: 'scheduled' as Lecture['status'],
  });
  
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    return () => clearAllIntervals();
  }, [user]);

  const clearAllIntervals = () => {
    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    if (codeIntervalRef.current) clearInterval(codeIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lecturesRes, coursesRes] = await Promise.all([
        api.getLectures(),
        api.getCourses()
      ]);

      if (coursesRes.success) {
        const teacherCourses = coursesRes.data.filter((c: any) => 
          c.teacherId === user?.id || c.teacherId?._id === user?.id
        );
        setCourses(teacherCourses);
        // Optional: Auto-select first course if available
        // if (teacherCourses.length > 0) setSelectedCourseId(teacherCourses[0]._id);
      }

      if (lecturesRes.success) {
        setLectures(lecturesRes.data);
        const active = lecturesRes.data.find((l: Lecture) => l.status === 'active');
        if (active) {
          // Do not auto-open the active session view.
          // User must select Course -> Lecture and then click Resume View.
          if (active.course_id && active.course_id._id) {
            setSelectedCourseId(active.course_id._id);
          }
          setSelectedLectureId(active._id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = (length: number) => {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const updateCodes = async (lectureId: string, type: 'qr' | 'code' | 'both') => {
    const updates: any = {};
    if (type === 'qr' || type === 'both') updates.qrCode = generateToken();
    if (type === 'code' || type === 'both') updates.classroomCode = generateCode(4);

    try {
      const result = await api.updateLectureCodes(lectureId, updates);
      if (result.success) {
        setSelectedLecture(prev => prev ? { ...prev, activeQrCode: updates.qrCode || prev.activeQrCode, activeClassCode: updates.classroomCode || prev.activeClassCode } : null);
      }
    } catch (error) {
      console.error('Failed to update codes', error);
    }
  };

  const startSession = async (lecture: Lecture) => {
    try {
      const result = await api.startLectureSession(lecture._id);
      if (result.success) {
        toast.success('Session started');
        handleResumeSession(result.data);
        updateCodes(lecture._id, 'both');
      }
    } catch (error) {
      toast.error('Failed to start session');
    }
  };

  const openEditLecture = (lecture: Lecture) => {
    const yyyyMmDd = lecture.date ? new Date(lecture.date).toISOString().slice(0, 10) : '';
    setEditForm({
      title: lecture.title || '',
      date: yyyyMmDd,
      startTime: lecture.startTime || '',
      endTime: lecture.endTime || '',
      status: lecture.status,
    });
    setEditOpen(true);
  };

  const saveEditLecture = async () => {
    const lecture = selectedLectureForSelection;
    if (!lecture) return;
    if (!editForm.title.trim() || !editForm.date || !editForm.startTime || !editForm.endTime) {
      toast.error('Please fill in title, date, and times');
      return;
    }

    setEditSaving(true);
    try {
      const payload = {
        title: editForm.title,
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        status: editForm.status,
      };
      const result = await api.updateLecture(lecture._id, payload);
      if (result.success) {
        toast.success('Lecture updated');
        setEditOpen(false);
        await fetchData();
        setSelectedLectureId(lecture._id);
      } else {
        toast.error(result.message || 'Failed to update lecture');
      }
    } catch (e) {
      toast.error('Failed to update lecture');
    } finally {
      setEditSaving(false);
    }
  };

  const handleResumeSession = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setSessionActive(true);
    if (lecture.course_id?._id) setSelectedCourseId(lecture.course_id._id);
    setSelectedLectureId(lecture._id);
    
    qrIntervalRef.current = setInterval(() => updateCodes(lecture._id, 'qr'), 30000);
    codeIntervalRef.current = setInterval(() => updateCodes(lecture._id, 'code'), 120000);

    if (lecture.sessionStartTime) {
      const startTime = new Date(lecture.sessionStartTime).getTime();
      const windowTime = 10 * 60 * 1000;
      
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = windowTime - elapsed;
        
        if (remaining <= 0) {
          setTimeLeft(0);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
  };

  const endSession = async () => {
    if (!selectedLecture) return;
    try {
      await api.endLectureSession(selectedLecture._id);
      toast.success('Session ended');
      setSessionActive(false);
      setSelectedLecture(null);
      setSelectedLectureId('');
      clearAllIntervals();
      fetchData();
    } catch (error) {
      toast.error('Failed to end session');
    }
  };

  const filteredLectures = lectures.filter(l => {
    if (!selectedCourseId) return false; // Don't show lectures if no course selected
    if (selectedCourseId !== 'all' && l.course_id._id !== selectedCourseId) return false;
    return true;
  });

  const selectedLectureForSelection = selectedLectureId
    ? filteredLectures.find(l => l._id === selectedLectureId) || null
    : null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60));
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold gradient-text">Lectures</h1>
        <p className="text-muted-foreground mt-1">Manage your class sessions</p>
      </div>

      {!sessionActive ? (
        <>
          <Card className="glass-card mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Course to Manage Sessions</label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={(v) => {
                      setSelectedCourseId(v);
                      setSelectedLectureId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Course..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Removed "All Courses" option to enforce selection */}
                      {courses.map(c => (
                        <SelectItem key={c._id} value={c._id}>{c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {!selectedCourseId ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Course Selected</h3>
              <p className="text-muted-foreground">Please select a course above to view and manage lectures.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Select Lecture</label>
                      <Select value={selectedLectureId} onValueChange={setSelectedLectureId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Lecture..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredLectures.map((l) => (
                            <SelectItem key={l._id} value={l._id}>
                              {format(new Date(l.date), 'MMM dd')} • {l.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filteredLectures.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">No lectures found for this course.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!selectedLectureForSelection ? (
                <div className="text-center py-10 text-muted-foreground">
                  Select a lecture to generate classroom code and QR.
                </div>
              ) : (
                <Card className="glass-card">
                  <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{selectedLectureForSelection.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedLectureForSelection.course_id.code} • {format(new Date(selectedLectureForSelection.date), 'MMM dd, yyyy')} • {selectedLectureForSelection.startTime} - {selectedLectureForSelection.endTime}
                      </p>
                      <div className="mt-2">
                        <Badge
                          variant={
                            selectedLectureForSelection.status === 'active'
                              ? 'default'
                              : selectedLectureForSelection.status === 'completed'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {selectedLectureForSelection.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(user?.role === 'teacher' || user?.role === 'admin') && (
                        <Button variant="outline" onClick={() => openEditLecture(selectedLectureForSelection)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                      )}
                      {selectedLectureForSelection.status === 'scheduled' && (
                        <Button onClick={() => startSession(selectedLectureForSelection)} className="gradient-primary">
                          <Play className="w-4 h-4 mr-2" /> Start Session
                        </Button>
                      )}
                      {selectedLectureForSelection.status === 'active' && (
                        <Button onClick={() => handleResumeSession(selectedLectureForSelection)} variant="default">
                          Resume View
                        </Button>
                      )}
                      {(selectedLectureForSelection.status === 'completed' || selectedLectureForSelection.status === 'cancelled') && (
                        <Button variant="secondary" disabled>
                          Session Unavailable
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <CardTitle>Active Session</CardTitle>
                <CardDescription>{selectedLecture?.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-medium">Attendance Window</span>
                  </div>
                  <span className={`text-2xl font-mono font-bold ${timeLeft < 60000 ? 'text-destructive' : 'text-primary'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">Classroom Code</p>
                    <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                      {selectedLecture?.activeClassCode || '----'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Refreshes every 2m
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg text-center flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Live Attendance</p>
                    <Button variant="link" size="sm" className="h-auto p-0">View List</Button>
                  </div>
                </div>

                <Button onClick={endSession} variant="destructive" className="w-full">
                  <Square className="w-4 h-4 mr-2" /> End Session
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col items-center justify-center">
            <Card className="glass-card w-full max-w-md aspect-square flex items-center justify-center bg-white">
              <div className="text-center">
                {selectedLecture?.activeQrCode ? (
                  <QRCodeSVG 
                    value={JSON.stringify({
                      type: 'attendance',
                      lectureId: selectedLecture._id,
                      token: selectedLecture.activeQrCode
                    })}
                    size={300}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p>Generating QR Code...</p>
                  </div>
                )}
              </div>
            </Card>
            <p className="mt-6 text-center text-muted-foreground flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Scan with student app to mark attendance
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              QR code refreshes automatically every 30 seconds
            </p>
          </div>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle>Update Lecture</DialogTitle>
            <DialogDescription>Edit lecture details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} placeholder="09:00" />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} placeholder="10:00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">scheduled</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="completed">completed</SelectItem>
                  <SelectItem value="cancelled">cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 gradient-primary" onClick={saveEditLecture} disabled={editSaving}>
                {editSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lectures;