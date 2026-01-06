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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MessageSquare, Send, Inbox, Mail, MailOpen, Loader2, Plus, User, RefreshCw, BookOpen, Megaphone } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface UserInfo {
  _id: string;
  name: string;
  email: string;
}

interface Message {
  _id: string;
  sender_id: string | UserInfo;
  recipient_id: string | UserInfo;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [recipientType, setRecipientType] = useState<'individual' | 'course'>('individual');

  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    course_id: '',
    subject: '',
    content: '',
  });

  // Helper function to get user ID
  const getUserId = () => {
    if (!user) return null;
    return user.id || user._id || (user as any).id || (user as any)._id;
  };

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchContacts();
      if (user.role === 'teacher') {
        fetchCourses();
      }
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await api.getMessages();
      if (result.success && result.data) {
        setMessages(result.data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    if (!user) return;
    setContactsLoading(true);
    try {
      const currentUserId = getUserId();
      const result = await api.getUsers();
      
      let usersData = [];
      if (result.success && result.data) {
        usersData = result.data;
      } else if (Array.isArray(result.data)) {
        usersData = result.data;
      }
      
      const availableContacts = usersData
        .filter((u: any) => {
          const userId = u._id || u.id;
          return userId !== currentUserId;
        })
        .map((u: any) => ({
          _id: u._id || u.id,
          name: u.name,
          email: u.email,
          role: u.role
        }));
      
      setContacts(availableContacts);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setContactsLoading(false);
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
    
    if (recipientType === 'individual' && !newMessage.recipient_id) {
      toast.error('Please select a recipient');
      return;
    }
    
    if (recipientType === 'course' && !newMessage.course_id) {
      toast.error('Please select a course');
      return;
    }

    if (!newMessage.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!newMessage.content.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const payload: any = {
        subject: newMessage.subject,
        content: newMessage.content,
      };

      if (recipientType === 'course') {
        payload.courseId = newMessage.course_id;
      } else {
        payload.recipientId = newMessage.recipient_id;
      }

      const result = await api.sendMessage(payload);

      if (result.success) {
        toast.success('Message sent successfully!');
        setDialogOpen(false);
        setNewMessage({ recipient_id: '', course_id: '', subject: '', content: '' });
        await fetchMessages();
      } else {
        toast.error(result.message || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await api.markMessageAsRead(messageId);
      setMessages(messages.map(m => 
        m._id === messageId ? { ...m, is_read: true } : m
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatMessageDate = (dateString: string) => {
    try {
      if (!dateString) return 'Just now';
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, 'MMM d, h:mm a') : 'Just now';
    } catch (error) {
      return 'Just now';
    }
  };

  const formatFullDate = (dateString: string) => {
    try {
      if (!dateString) return 'Unknown date';
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : 'Unknown date';
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getName = (userObj: string | UserInfo | undefined) => {
    if (!userObj) return 'Unknown';
    if (typeof userObj === 'string') return 'Unknown';
    return userObj.name || 'Unknown';
  };

  const isAnnouncement = (subject: string) => {
    return subject.startsWith('[') || subject.toLowerCase().includes('announcement');
  };

  const currentUserId = getUserId();
  
  const inboxMessages = messages.filter(m => {
    const recipientId = (m.recipient_id as any)?._id || m.recipient_id;
    const recipientIdStr = typeof recipientId === 'object' ? recipientId.toString() : String(recipientId);
    const userIdStr = String(currentUserId);
    // Filter out announcements for Messages page
    return recipientIdStr === userIdStr && !isAnnouncement(m.subject);
  });

  const sentMessages = messages.filter(m => {
    const senderId = (m.sender_id as any)?._id || m.sender_id;
    const senderIdStr = typeof senderId === 'object' ? senderId.toString() : String(senderId);
    const userIdStr = String(currentUserId);
    // Filter out announcements for Messages page
    return senderIdStr === userIdStr && !isAnnouncement(m.subject);
  });

  const announcementMessages = messages.filter(m => {
    const recipientId = (m.recipient_id as any)?._id || m.recipient_id;
    const recipientIdStr = typeof recipientId === 'object' ? recipientId.toString() : String(recipientId);
    const userIdStr = String(currentUserId);
    
    const senderId = (m.sender_id as any)?._id || m.sender_id;
    const senderIdStr = typeof senderId === 'object' ? senderId.toString() : String(senderId);

    // Show if user is recipient OR sender, AND it is an announcement
    return (recipientIdStr === userIdStr || senderIdStr === userIdStr) && isAnnouncement(m.subject);
  });

  const unreadCount = inboxMessages.filter(m => !m.is_read).length;
  const unreadAnnouncements = announcementMessages.filter(m => !m.is_read && ((m.recipient_id as any)?._id || m.recipient_id) === currentUserId).length;

  const openMessage = (message: Message) => {
    setSelectedMessage(message);
    const recipientId = (message.recipient_id as any)?._id || message.recipient_id;
    if (String(recipientId) === String(currentUserId) && !message.is_read) {
      markAsRead(message._id);
    }
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'sent': return sentMessages;
      case 'announcements': return announcementMessages;
      default: return inboxMessages;
    }
  };

  const activeList = getActiveList();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold">
            <span className="gradient-text">Messages</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Communicate with teachers, students, and parents
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMessages} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>Compose Message</DialogTitle>
                <DialogDescription>
                  Send a message to another user or make an announcement
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSend} className="space-y-4">
                
                {user?.role === 'teacher' && (
                  <div className="flex p-1 bg-muted rounded-lg mb-4">
                    <button
                      type="button"
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                        recipientType === 'individual' 
                          ? 'bg-background shadow-sm text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setRecipientType('individual')}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                        recipientType === 'course' 
                          ? 'bg-background shadow-sm text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setRecipientType('course')}
                    >
                      Class Announcement
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{recipientType === 'course' ? 'Select Class' : 'To'}</Label>
                  
                  {recipientType === 'course' ? (
                    <Select
                      value={newMessage.course_id}
                      onValueChange={(value) => setNewMessage({ ...newMessage, course_id: value })}
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
                  ) : (
                    <Select
                      value={newMessage.recipient_id}
                      onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact._id} value={contact._id}>
                            <div className="flex items-center gap-2">
                              <span>{contact.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {contact.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Message subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    placeholder="Type your message..."
                    rows={5}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full gradient-primary" 
                  disabled={sending || (recipientType === 'individual' && contacts.length === 0)}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="inbox" className="flex items-center gap-2">
                    <Inbox className="w-4 h-4" />
                    <span className="hidden sm:inline">Inbox</span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Sent</span>
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    <span className="hidden sm:inline">News</span>
                    {unreadAnnouncements > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
                        {unreadAnnouncements}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeList.map((message) => (
                      <button
                        key={message._id}
                        onClick={() => openMessage(message)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                          selectedMessage?._id === message._id ? 'bg-primary/10' : ''
                        } ${!message.is_read && (activeTab === 'inbox' || (activeTab === 'announcements' && ((message.recipient_id as any)?._id || message.recipient_id) === currentUserId)) ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center flex-shrink-0">
                            {isAnnouncement(message.subject) ? (
                              <Megaphone className="w-5 h-5 text-secondary-foreground" />
                            ) : (
                              <User className="w-5 h-5 text-secondary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {activeTab === 'sent' 
                                  ? getName(message.recipient_id)
                                  : getName(message.sender_id)}
                              </span>
                              {isAnnouncement(message.subject) && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                  Announcement
                                </Badge>
                              )}
                              {!message.is_read && (activeTab === 'inbox' || (activeTab === 'announcements' && ((message.recipient_id as any)?._id || message.recipient_id) === currentUserId)) && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="text-sm font-medium truncate mt-0.5">{message.subject || 'No subject'}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {message.content ? message.content.substring(0, 50) + '...' : 'No content'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatMessageDate(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {activeList.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          {activeTab === 'inbox' ? 'No messages in inbox' : 
                           activeTab === 'sent' ? 'No sent messages' : 
                           'No announcements'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-full">
            {selectedMessage ? (
              <>
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle>{selectedMessage.subject || 'No subject'}</CardTitle>
                        {isAnnouncement(selectedMessage.subject) && (
                          <Badge variant="secondary">Announcement</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {activeTab === 'sent' ? 'To' : 'From'}:{' '}
                        <span className="font-medium">
                          {activeTab === 'sent'
                            ? getName(selectedMessage.recipient_id)
                            : getName(selectedMessage.sender_id)}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {formatFullDate(selectedMessage.created_at)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessage.content || 'No content'}</p>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center justify-center h-full py-20">
                <MailOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Select a message</p>
                <p className="text-muted-foreground">Choose a message to read its contents</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
