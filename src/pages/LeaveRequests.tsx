import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Calendar, FileText, CheckCircle, XCircle, Clock, Plus, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LeaveRequest {
  _id: string;
  student_id: {
    _id: string;
    name: string;
    email: string;
  };
  course_id: {
    _id: string;
    name: string;
    code: string;
  } | null; // Allow null to handle missing courses safely
  from_date: string;
  to_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  review_comment?: string;
  created_at: string;
}

const LeaveRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

  const [newRequest, setNewRequest] = useState({
    course_id: '',
    from_date: '',
    to_date: '',
    reason: ''
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
      if (user.role === 'student') {
        fetchCourses();
      }
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await api.getLeaveRequests();
      if (result.success && result.data) {
        setRequests(result.data);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      // Students should only see courses they are enrolled in
      const result = await api.getCourses();
      if (result.success && result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.course_id || !newRequest.from_date || !newRequest.to_date || !newRequest.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createLeaveRequest({
        courseId: newRequest.course_id,
        fromDate: newRequest.from_date,
        toDate: newRequest.to_date,
        reason: newRequest.reason
      });

      if (result.success) {
        toast.success('Leave request submitted successfully');
        setDialogOpen(false);
        setNewRequest({ course_id: '', from_date: '', to_date: '', reason: '' });
        fetchRequests();
      } else {
        toast.error(result.message || 'Failed to submit request');
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const comment = (reviewComments[id] || '').trim();
      const result = await api.reviewLeaveRequest(id, status, comment || undefined);
      if (result.success) {
        toast.success(`Request ${status}`);
        setReviewComments(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        fetchRequests();
      } else {
        toast.error(result.message || `Failed to ${status} request`);
      }
    } catch (error) {
      toast.error(`Failed to ${status} request`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success hover:bg-success/90">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Leave Requests</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'student' 
              ? 'Request leave for missed classes' 
              : 'Review student leave requests'}
          </p>
        </div>

        {user?.role === 'student' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
                <DialogDescription>
                  Provide details for your absence
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={newRequest.course_id}
                    onValueChange={(value) => setNewRequest({ ...newRequest, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course._id} value={course._id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from_date">From Date</Label>
                    <Input
                      id="from_date"
                      type="date"
                      value={newRequest.from_date}
                      onChange={(e) => setNewRequest({ ...newRequest, from_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to_date">To Date</Label>
                    <Input
                      id="to_date"
                      type="date"
                      value={newRequest.to_date}
                      onChange={(e) => setNewRequest({ ...newRequest, to_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    placeholder="Why are you requesting leave?"
                    rows={3}
                    required
                  />
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-semibold mb-2">No leave requests found</p>
            <p className="text-sm text-muted-foreground">
              {user?.role === 'student' 
                ? 'Create a new request to get started' 
                : 'Student requests will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request._id} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Safety check: use optional chaining for course_id */}
                      <Badge variant="outline">
                        {request.course_id?.code || "Deleted Course"}
                      </Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">
                      {request.course_id?.name || "Unknown Course"}
                    </h3>
                    
                    {user?.role === 'teacher' && (
                      <p className="text-sm font-medium text-primary mb-2">
                        Student: {request.student_id?.name} ({request.student_id?.email})
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(request.from_date)} - {formatDate(request.to_date)}
                      </span>
                    </div>

                    <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border">
                      {request.reason}
                    </p>

                    {request.review_comment && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Teacher's Note:</span> {request.review_comment}
                      </div>
                    )}
                  </div>

                  {user?.role === 'teacher' && request.status === 'pending' && (
                    <div className="flex flex-row sm:flex-col gap-2 justify-end">
                      <div className="w-full sm:w-64">
                        <Label className="text-xs">Review comment (optional)</Label>
                        <Textarea
                          value={reviewComments[request._id] || ''}
                          onChange={(e) =>
                            setReviewComments(prev => ({ ...prev, [request._id]: e.target.value }))
                          }
                          placeholder="Add a note for the student"
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="bg-success hover:bg-success/90"
                        onClick={() => handleReview(request._id, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleReview(request._id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
