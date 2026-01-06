import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  UserPlus, Search, Loader2, Users, Check, X, 
  GraduationCap, Mail
} from 'lucide-react';

interface StudentEnrollmentProps {
  courseId: string;
  courseName: string;
  courseCode: string;
  onEnrollmentChange?: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  isEnrolled: boolean;
}

const StudentEnrollment: React.FC<StudentEnrollmentProps> = ({ 
  courseId, 
  courseName, 
  courseCode,
  onEnrollmentChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [initialEnrolled, setInitialEnrolled] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen, courseId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    
    try {
      // Get all students
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, student_id');

      if (profilesError) throw profilesError;

      // Get student role user IDs
      const { data: studentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (rolesError) throw rolesError;

      const studentIds = new Set(studentRoles?.map(r => r.user_id) || []);

      // Get current enrollments for this course
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('student_id')
        .eq('course_id', courseId);

      if (enrollError) throw enrollError;

      const enrolledIds = new Set(enrollments?.map(e => e.student_id) || []);
      setInitialEnrolled(enrolledIds);
      setSelectedStudents(new Set(enrolledIds));

      // Filter only students
      const studentProfiles: Student[] = (allProfiles || [])
        .filter(p => studentIds.has(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          student_id: p.student_id,
          isEnrolled: enrolledIds.has(p.id)
        }));

      setStudents(studentProfiles);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Find students to add and remove
      const toAdd = [...selectedStudents].filter(id => !initialEnrolled.has(id));
      const toRemove = [...initialEnrolled].filter(id => !selectedStudents.has(id));

      // Add new enrollments
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('course_enrollments')
          .insert(toAdd.map(student_id => ({
            course_id: courseId,
            student_id
          })));

        if (insertError) throw insertError;
      }

      // Remove enrollments
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('course_enrollments')
          .delete()
          .eq('course_id', courseId)
          .in('student_id', toRemove);

        if (deleteError) throw deleteError;
      }

      const changes = toAdd.length + toRemove.length;
      if (changes > 0) {
        toast.success(`Enrollment updated: ${toAdd.length} added, ${toRemove.length} removed`);
        onEnrollmentChange?.();
      } else {
        toast.info('No changes made');
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating enrollments:', error);
      toast.error('Failed to update enrollments');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(
    s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (s.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const enrolledCount = selectedStudents.size;
  const hasChanges = 
    [...selectedStudents].some(id => !initialEnrolled.has(id)) ||
    [...initialEnrolled].some(id => !selectedStudents.has(id));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Enroll Students
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Manage Enrollment
          </DialogTitle>
          <DialogDescription>
            Add or remove students from {courseCode} - {courseName}
          </DialogDescription>
        </DialogHeader>
        
        {/* Stats */}
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <Check className="w-3 h-3" />
            {enrolledCount} enrolled
          </Badge>
          {hasChanges && (
            <Badge variant="outline" className="gap-1 text-warning border-warning">
              Unsaved changes
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Student List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No students found</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedStudents.has(student.id)
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/30 border-transparent hover:bg-muted/50'
                  }`}
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox
                    checked={selectedStudents.has(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{student.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  </div>
                  {student.student_id && (
                    <Badge variant="outline" className="shrink-0">
                      {student.student_id}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStudents(new Set(students.map(s => s.id)))}
              disabled={isLoading}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStudents(new Set())}
              disabled={isLoading}
            >
              Clear All
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="hero" 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentEnrollment;