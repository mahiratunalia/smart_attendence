import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Users, 
  Search, 
  Plus, 
  Loader2, 
  Check, 
  X, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Calendar,
  Clock,
  MapPin,
  Download,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { format } from 'date-fns';

interface Course {
  _id: string;
  name: string;
  code: string;
  description: string;
  teacherId: { _id: string; name: string };
  students: any[];
}

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
}

interface Resource {
  _id: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'link' | 'presentation' | 'other';
  file_url?: string;
  file_name?: string;
  uploaded_by?: { name: string };
  created_at: string;
}

interface Lecture {
  _id: string;
  title: string;
  course_id: { _id: string; name: string; code: string };
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: string;
}

const Courses: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Course detail view state
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [courseResources, setCourseResources] = useState<Resource[]>([]);
  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  useEffect(() => {
    if (enrollDialogOpen) {
      fetchStudents();
    }
  }, [enrollDialogOpen, searchQuery]);

  useEffect(() => {
    if (viewingCourse) {
      fetchCourseDetails(viewingCourse._id);
    }
  }, [viewingCourse]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const result = await api.getCourses();
      if (result.success && result.data) {
        setCourses(result.data);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId: string) => {
    setLoadingDetails(true);
    try {
      // Fetch resources for this course
      const resourcesResult = await api.getResources();
      if (resourcesResult.success && resourcesResult.data) {
        const filtered = resourcesResult.data.filter(
          (r: any) => r.course_id?._id === courseId
        );
        setCourseResources(filtered);
      }

      // Fetch lectures for this course
      const lecturesResult = await api.getLectures();
      if (lecturesResult.success && lecturesResult.data) {
        const filtered = lecturesResult.data.filter(
          (l: any) => l.course_id?._id === courseId
        );
        setCourseLectures(filtered);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      toast.error('Failed to load course details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const result = await api.getUsers('student', searchQuery);
      
      if (result.success && result.data) {
        setAllStudents(result.data);
      } else {
        setAllStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleEnroll = async (studentId: string) => {
    if (!selectedCourse) return;
    try {
      const result = await api.enrollStudent(selectedCourse._id, studentId);
      if (result.success) {
        toast.success('Student enrolled successfully');
        fetchCourses();
        setSelectedCourse(prev => prev ? {
          ...prev,
          students: [...prev.students, { _id: studentId }]
        } : null);
      } else {
        toast.error(result.message || 'Failed to enroll student');
      }
    } catch (error) {
      toast.error('Failed to enroll student');
    }
  };

  const handleUnenroll = async (studentId: string) => {
    if (!selectedCourse) return;
    try {
      const result = await api.unenrollStudent(selectedCourse._id, studentId);
      if (result.success) {
        toast.success('Student unenrolled successfully');
        fetchCourses();
        setSelectedCourse(prev => prev ? {
          ...prev,
          students: prev.students.filter(s => (typeof s === 'string' ? s : s._id) !== studentId)
        } : null);
      } else {
        toast.error(result.message || 'Failed to unenroll student');
      }
    } catch (error) {
      toast.error('Failed to unenroll student');
    }
  };

  const isEnrolled = (studentId: string) => {
    if (!selectedCourse) return false;
    return selectedCourse.students.some(s => (s._id === studentId) || (s === studentId));
  };

  const openEnrollDialog = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCourse(course);
    setSearchQuery('');
    setEnrollDialogOpen(true);
  };

  const handleDownload = async (resource: Resource) => {
    if (!resource.file_url) {
      toast.error('Download link not available');
      return;
    }

    try {
      await api.incrementResourceView(resource._id);
      if (resource.type === 'link' || resource.file_url.startsWith('http')) {
        window.open(resource.file_url, '_blank');
        toast.success('Opening resource in new tab');
        return;
      }

      const result = await api.downloadResource(resource.file_url, resource.file_name || 'download');
      if (result.success) {
        toast.success('Download started');
      } else {
        toast.error(result.message || 'Failed to download');
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      document: <FileText className="w-5 h-5 text-blue-500" />,
      video: <Video className="w-5 h-5 text-purple-500" />,
      link: <LinkIcon className="w-5 h-5 text-green-500" />,
      presentation: <FileText className="w-5 h-5 text-orange-500" />,
      other: <FileText className="w-5 h-5 text-gray-500" />
    };
    return icons[type] || icons.other;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Course Detail View
  if (viewingCourse) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => setViewingCourse(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-lg px-3 py-1">{viewingCourse.code}</Badge>
            <h1 className="font-heading text-3xl font-bold gradient-text">{viewingCourse.name}</h1>
          </div>
          <p className="text-muted-foreground mt-2">{viewingCourse.description}</p>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <GraduationCap className="w-4 h-4 mr-1" />
              {viewingCourse.teacherId?.name || 'Unknown Instructor'}
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {viewingCourse.students?.length || 0} Students
            </div>
          </div>
        </div>

        {loadingDetails ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="resources" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resources ({courseResources.length})
              </TabsTrigger>
              <TabsTrigger value="lectures" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Lectures ({courseLectures.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="mt-6">
              {courseResources.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold">No resources yet</h3>
                    <p className="text-muted-foreground">No resources have been uploaded for this course.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {courseResources.map((resource) => (
                    <Card key={resource._id} className="glass-card hover:shadow-md transition-all">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-muted">
                            {getFileIcon(resource.type)}
                          </div>
                          <div>
                            <h4 className="font-semibold">{resource.title}</h4>
                            {resource.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>By {resource.uploaded_by?.name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{formatDate(resource.created_at)}</span>
                              <Badge variant="secondary" className="text-xs">
                                {resource.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(resource)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="lectures" className="mt-6">
              {courseLectures.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-semibold">No lectures scheduled</h3>
                    <p className="text-muted-foreground">No lectures have been scheduled for this course.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {courseLectures.map((lecture) => (
                    <Card key={lecture._id} className="glass-card hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{lecture.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(lecture.date)}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {lecture.startTime} - {lecture.endTime}
                              </div>
                              {lecture.location && (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {lecture.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant={lecture.status === 'completed' ? 'default' : 
                                    lecture.status === 'active' ? 'secondary' : 'outline'}
                          >
                            {lecture.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  // Course List View
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold gradient-text">Courses</h1>
          <p className="text-muted-foreground mt-1">Manage your courses and enrollments</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold">No courses found</h3>
          <p className="text-muted-foreground">You are not assigned to any courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card 
              key={course._id} 
              className="glass-card hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setViewingCourse(course)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2">{course.code}</Badge>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {course.name}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 mt-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-1" />
                    {course.students?.length || 0} Students
                  </div>
                  
                  {user?.role === 'teacher' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => openEnrollDialog(course, e)}
                    >
                      Manage Enrollment
                    </Button>
                  )}
                </div>
                <div className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view resources and lectures →
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="glass-card max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Enrollment</DialogTitle>
            <DialogDescription>
              {selectedCourse ? `Add or remove students from ${selectedCourse.code} - ${selectedCourse.name}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={selectedCourse.students?.length > 0 ? "default" : "secondary"}>
                  {selectedCourse.students?.length || 0} enrolled
                </Badge>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search students by name, email, or ID..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="flex-1 pr-4">
                {loadingStudents ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : allStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No students found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allStudents.map((student) => {
                      const enrolled = isEnrolled(student._id);
                      return (
                        <div key={student._id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                            <p className="text-xs text-muted-foreground">ID: {student.studentId}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={enrolled ? "destructive" : "default"}
                            onClick={() => enrolled ? handleUnenroll(student._id) : handleEnroll(student._id)}
                          >
                            {enrolled ? (
                              <>
                                <X className="w-4 h-4 mr-1" /> Remove
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Courses;
