import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  event_type: 'lecture' | 'exam' | 'assignment' | 'holiday' | 'other';
  start_date: string;
  end_date?: string;
  course_id?: {
    _id: string;
    name: string;
    code: string;
  };
  lecture_id?: {
    _id: string;
    title: string;
    startTime: string;
    endTime: string;
  };
  location?: string;
  attendance_status?: 'present' | 'absent' | 'late' | null;
}

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    if (user) {
      fetchSchedule();
    }
  }, [user, currentDate]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      console.log('Fetching schedule from:', format(startDate, 'yyyy-MM-dd'), 'to:', format(endDate, 'yyyy-MM-dd'));

      const result = await api.getSchedule(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      console.log('Schedule result:', result);

      if (result.success && result.data) {
        console.log('Setting events:', result.data);
        setEvents(result.data);
      } else {
        console.log('No data or not successful:', result);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getDaysInWeek = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_date), day)
    );
  };

  const handlePreviousMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const openEventDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      lecture: 'bg-blue-500',
      exam: 'bg-red-500',
      assignment: 'bg-yellow-500',
      holiday: 'bg-green-500',
      other: 'bg-gray-500'
    };
    return colors[type] || colors.other;
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, any> = {
      lecture: Clock,
      exam: AlertCircle,
      assignment: FileText,
      holiday: CalendarIcon,
      other: CalendarIcon
    };
    const Icon = icons[type] || CalendarIcon;
    return <Icon className="w-4 h-4" />;
  };

  const getAttendanceIcon = (status?: string | null) => {
    if (!status) return null;
    const icons: Record<string, JSX.Element> = {
      present: <CheckCircle className="w-4 h-4 text-success" />,
      late: <AlertCircle className="w-4 h-4 text-warning" />,
      absent: <XCircle className="w-4 h-4 text-destructive" />
    };
    return icons[status] || null;
  };

  const days = viewMode === 'month' ? getDaysInMonth() : getDaysInWeek();
  const today = new Date();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold gradient-text">Class Schedule</h1>
        <p className="text-muted-foreground mt-1">Your academic calendar</p>
      </div>

      {/* Calendar Controls */}
      <Card className="glass-card mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <h2 className="text-xl font-bold">
              {viewMode === 'month' 
                ? format(currentDate, 'MMMM yyyy')
                : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}`
              }
            </h2>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="glass-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow cursor-default">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-gray-800">Lecture</span>
            </div>
            
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow cursor-default">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-gray-800">Exam</span>
            </div>
            
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow cursor-default">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm font-semibold text-gray-800">Assignment</span>
            </div>
            
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow cursor-default">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-gray-800">Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : viewMode === 'month' ? (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, today);
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={day.toString()}
                    className={`aspect-square border rounded-lg p-2 ${
                      isToday ? 'border-primary bg-primary/5' : 'border-border'
                    } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      
                      <div className="flex-1 overflow-hidden mt-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <button
                            key={event._id}
                            onClick={() => openEventDialog(event)}
                            className={`w-full text-left text-xs p-1 rounded mb-1 ${getEventColor(event.event_type)} text-white truncate hover:opacity-80 transition-opacity`}
                          >
                            {event.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {days.map(day => (
                <div key={day.toString()} className="text-center py-2">
                  <div className="font-semibold text-sm text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${isSameDay(day, today) ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 mt-4">
              {days.map(day => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={day.toString()}
                    className={`min-h-[400px] border rounded-lg p-3 ${
                      isToday ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="space-y-2">
                      {dayEvents.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          No events
                        </div>
                      ) : (
                        dayEvents.map((event) => (
                          <button
                            key={event._id}
                            onClick={() => openEventDialog(event)}
                            className={`w-full text-left p-3 rounded-lg ${getEventColor(event.event_type)} text-white hover:opacity-90 transition-opacity`}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              {getEventIcon(event.event_type)}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{event.title}</p>
                                {event.lecture_id && (
                                  <p className="text-xs opacity-90 mt-1">
                                    {event.lecture_id.startTime} - {event.lecture_id.endTime}
                                  </p>
                                )}
                                {event.course_id && (
                                  <p className="text-xs opacity-80 mt-1 truncate">
                                    {event.course_id.code}
                                  </p>
                                )}
                                {event.location && (
                                  <p className="text-xs opacity-80 mt-1 truncate flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </p>
                                )}
                              </div>
                            </div>
                            {event.attendance_status && (
                              <div className="flex items-center gap-1 mt-2">
                                {getAttendanceIcon(event.attendance_status)}
                                <span className="text-xs capitalize">{event.attendance_status}</span>
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.event_type)}
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.description || 'Event details'}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
                </Badge>
              </div>

              {selectedEvent.course_id && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Course</p>
                  <p className="text-sm">
                    {selectedEvent.course_id.code} - {selectedEvent.course_id.name}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Date & Time</p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(selectedEvent.start_date), 'MMM dd, yyyy')}</span>
                  {selectedEvent.lecture_id && (
                    <span>
                      • {selectedEvent.lecture_id.startTime} - {selectedEvent.lecture_id.endTime}
                    </span>
                  )}
                </div>
              </div>

              {selectedEvent.location && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Location</p>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>
              )}

              {selectedEvent.attendance_status && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Attendance</p>
                  <div className="flex items-center gap-2">
                    {getAttendanceIcon(selectedEvent.attendance_status)}
                    <span className="text-sm capitalize">{selectedEvent.attendance_status}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
