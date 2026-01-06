-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Students can view enrolled courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view course enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Teachers can manage course enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrolled students" ON public.profiles;

-- Create a SECURITY DEFINER function to check if a student is enrolled in a course (breaks recursion)
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_student_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments
    WHERE student_id = _student_id
      AND course_id = _course_id
  )
$$;

-- Create a SECURITY DEFINER function to check if a teacher owns a course
CREATE OR REPLACE FUNCTION public.is_course_teacher(_teacher_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = _course_id
      AND teacher_id = _teacher_id
  )
$$;

-- Create a SECURITY DEFINER function to check if a teacher teaches a student
CREATE OR REPLACE FUNCTION public.teacher_has_student(_teacher_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    JOIN public.courses c ON ce.course_id = c.id
    WHERE ce.student_id = _student_id
      AND c.teacher_id = _teacher_id
  )
$$;

-- Recreate policies using the SECURITY DEFINER functions

-- Students can view courses they're enrolled in
CREATE POLICY "Students can view enrolled courses" 
ON public.courses 
FOR SELECT 
USING (is_enrolled_in_course(auth.uid(), id));

-- Teachers can view enrollments for their courses
CREATE POLICY "Teachers can view course enrollments" 
ON public.course_enrollments 
FOR SELECT 
USING (is_course_teacher(auth.uid(), course_id));

-- Teachers can manage enrollments for their courses
CREATE POLICY "Teachers can manage course enrollments" 
ON public.course_enrollments 
FOR ALL 
USING (is_course_teacher(auth.uid(), course_id));

-- Teachers can view profiles of students in their courses
CREATE POLICY "Teachers can view enrolled students" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND teacher_has_student(auth.uid(), id)
);