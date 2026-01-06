// src/pages/Notifications.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// Layout provided by App.tsx
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  Filter,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type UiNotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: UiNotificationType;
  isRead: boolean;
  createdAt: string;
}

type ApiNotification = {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'lecture' | 'assignment' | 'resource' | 'announcement' | 'leave' | 'general';
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
};

const mapNotificationType = (n: ApiNotification): UiNotificationType => {
  if (n.type === 'leave') return n.priority === 'high' ? 'warning' : 'info';
  if (n.type === 'assignment') return 'info';
  if (n.type === 'resource') return 'info';
  if (n.type === 'lecture') return n.priority === 'high' ? 'warning' : 'info';
  if (n.type === 'announcement') return 'info';
  return n.priority === 'high' ? 'warning' : 'info';
};

const toUiNotification = (n: ApiNotification): Notification => ({
  _id: n._id,
  title: n.title,
  message: n.message,
  type: mapNotificationType(n),
  isRead: n.is_read,
  createdAt: n.createdAt,
});

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const result = await api.getNotifications();
      if (result.success && result.data) {
        const mapped = (result.data as ApiNotification[]).map(toUiNotification);
        setNotifications(mapped);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await api.markNotificationAsRead(id);
      if (!result.success) {
        throw new Error(result.message || 'Failed');
      }
      setNotifications(prev => prev.map(n => (n._id === id ? { ...n, isRead: true } : n)));
      toast.success('Notification marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    } finally {
      setActionLoading(null);
    }
  };

  const markAllAsRead = async () => {
    setActionLoading('all');
    try {
      const result = await api.markAllNotificationsAsRead();
      if (!result.success) {
        throw new Error(result.message || 'Failed');
      }
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteNotification = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await api.deleteNotification(id);
      if (!result.success) {
        throw new Error(result.message || 'Failed');
      }
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    } finally {
      setActionLoading(null);
    }
  };

  const clearAllRead = async () => {
    setActionLoading('clear');
    try {
      // Backend doesn't have a bulk delete-read endpoint; mimic by deleting read notifications client-side.
      setNotifications(prev => prev.filter(n => !n.isRead));
      toast.success('Read notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    } finally {
      setActionLoading(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'error': return <XCircle className="w-5 h-5 text-destructive" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-success/10 border-success/20';
      case 'warning': return 'bg-warning/10 border-warning/20';
      case 'error': return 'bg-destructive/10 border-destructive/20';
      default: return 'bg-primary/10 border-primary/20';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold gradient-text flex items-center gap-3">
              <Bell className="w-8 h-8" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.role === 'teacher'
                ? 'Stay updated with your classes, requests, and student activity'
                : 'Stay updated with your academic activities'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchNotifications}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || actionLoading === 'all'}
            >
              {actionLoading === 'all' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4 mr-2" />
              )}
              Mark All Read
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllRead}
              disabled={notifications.filter(n => n.isRead).length === 0 || actionLoading === 'clear'}
            >
              {actionLoading === 'clear' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Clear Read
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{notifications.length}</p>
                </div>
                <Bell className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-3xl font-bold text-primary">{unreadCount}</p>
                </div>
                <BellOff className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Read</p>
                  <p className="text-3xl font-bold text-success">{notifications.length - unreadCount}</p>
                </div>
                <CheckCheck className="w-10 h-10 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="glass-card">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="read">
                  Read ({notifications.length - unreadCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading notifications...</p>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <BellOff className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'unread' 
                      ? "You're all caught up! No unread notifications."
                      : activeTab === 'read'
                      ? "No read notifications yet."
                      : "You don't have any notifications yet."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 hover:bg-muted/50 transition-colors ${
                        !notification.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-3 rounded-xl ${getNotificationBgColor(notification.type)} border`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{notification.title}</h4>
                                {!notification.isRead && (
                                  <Badge variant="default" className="h-5">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification._id)}
                                  disabled={actionLoading === notification._id}
                                  title="Mark as read"
                                >
                                  {actionLoading === notification._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification._id)}
                                disabled={actionLoading === notification._id}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Notifications;