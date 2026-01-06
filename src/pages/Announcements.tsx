import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Megaphone, Send, Loader2, Plus, BookOpen, RefreshCw, Calendar } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface Message {
  _id: string;
  sender_id: any;
  recipient_id: any;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Message[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Message | null>(null);

  const [newAnnouncement, setNewAnnouncement] = useState({
    course_id: '',
    subject: '',
    content: '',
  });

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      if (user.role === 'teacher') {
        fetchCourses();
      }
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const result = await api.getMessages();
      if (result.success && result.data) {
        // Filter for announcements (subject starts with [)
        const allMessages = result.data;
        const announcementList = allMessages.filter((m: Message) => 
          m.subject.startsWith('[') || m.subject.toLowerCase().includes('announcement')
        );
        setAnnouncements(announcementList);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const result = await api.getCourses();
      if (result.success && result.data) {
        const teacherCourses = result.data.filter((c: any) => 
          c.teacherId === user?.id || c.teacherId?._id === user?.id
        );
        setCourses(teacherCourses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAnnouncement.course_id) {
      toast.error('Please select a course');
      return;
    }
    if (!newAnnouncement.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!newAnnouncement.content.trim()) {
      toast.error('Please enter content');
      return;
    }

    setSending(true);
    try {
      const result = await api.sendMessage({
        courseId: newAnnouncement.course_id,
        subject: newAnnouncement.subject,
        content: newAnnouncement.content,
      });

      if (result.success) {
        toast.success('Announcement sent successfully!');
        setDialogOpen(false);
        setNewAnnouncement({ course_id: '', subject: '', content: '' });
        fetchAnnouncements();
      } else {
        toast.error(result.message || 'Failed to send announcement');
      }
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (dateString: string) => {
    try {
      if (!dateString) return 'Just now';
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : 'Just now';
    } catch (error) {
      return 'Just now';
    }
  };

  const getName = (userObj: any) => {
    if (!userObj) return 'Unknown';
    if (typeof userObj === 'string') return 'Unknown';
    return userObj.name || 'Unknown';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold">
            <span className="gradient-text">Announcements</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Class updates and important notifications
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAnnouncements} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {user?.role === 'teacher' && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card">
                <DialogHeader>
                  <DialogTitle>Post Announcement</DialogTitle>
                  <DialogDescription>
                    Send an update to all students in a class
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Class</Label>
                    <Select
                      value={newAnnouncement.course_id}
                      onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, course_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course._id} value={course._id}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              <span>{course.code} - {course.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={newAnnouncement.subject}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, subject: e.target.value })}
                      placeholder="Announcement title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                      placeholder="Type your announcement..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary" 
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post Announcement
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcement List */}
        <div className="lg:col-span-1">
          <Card className="glass-card h-[600px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Recent Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                    <Megaphone className="w-12 h-12 text-muted-foreground mb-2 opacity-50" />
                    <p className="text-muted-foreground">No announcements yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {announcements.map((announcement) => (
                      <button
                        key={announcement._id}
                        onClick={() => setSelectedAnnouncement(announcement)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedAnnouncement?._id === announcement._id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">
                                {getName(announcement.sender_id)}
                              </span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatMessageDate(announcement.created_at)}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate mt-0.5">{announcement.subject}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {announcement.content.substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Announcement Detail */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-[600px] flex flex-col">
            {selectedAnnouncement ? (
              <>
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Announcement</Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatMessageDate(selectedAnnouncement.created_at)}
                        </span>
                      </div>
                      <CardTitle className="text-xl">{selectedAnnouncement.subject}</CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-2">
                        Posted by <span className="font-medium text-foreground">{getName(selectedAnnouncement.sender_id)}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1 overflow-auto">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                      {selectedAnnouncement.content}
                    </p>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center justify-center h-full">
                <Megaphone className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                <p className="text-lg font-medium">Select an announcement</p>
                <p className="text-muted-foreground">View details of class updates</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
