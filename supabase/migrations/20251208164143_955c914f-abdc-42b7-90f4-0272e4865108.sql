-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin', 'parent');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  student_id TEXT,
  department_id UUID REFERENCES public.departments(id),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE (user_id, role)
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  teacher_id UUID REFERENCES public.profiles(id) NOT NULL,
  section TEXT NOT NULL,
  semester TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create course_enrollments table
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (course_id, student_id)
);

-- Create lectures table
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT NOT NULL,
  qr_code TEXT,
  classroom_code TEXT,
  code_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT false,
  attendance_window_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  marked_by TEXT NOT NULL CHECK (marked_by IN ('qr', 'code', 'manual')),
  ip_address TEXT,
  UNIQUE (lecture_id, student_id)
);

-- Create parent_student_links table
CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Departments policies (public read)
CREATE POLICY "Departments are viewable by everyone" ON public.departments
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can view enrolled students" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      JOIN public.courses c ON ce.course_id = c.id
      WHERE ce.student_id = profiles.id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view linked children profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'parent') AND
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = profiles.id
    )
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Courses policies
CREATE POLICY "Students can view enrolled courses" ON public.courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_id = courses.id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view their courses" ON public.courses
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage their courses" ON public.courses
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Course enrollments policies
CREATE POLICY "Students can view their enrollments" ON public.course_enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view course enrollments" ON public.course_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_enrollments.course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage course enrollments" ON public.course_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_enrollments.course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage enrollments" ON public.course_enrollments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lectures policies
CREATE POLICY "Students can view enrolled course lectures" ON public.lectures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_id = lectures.course_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage their course lectures" ON public.lectures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = lectures.course_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all lectures" ON public.lectures
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Attendance records policies
CREATE POLICY "Students can view their attendance" ON public.attendance_records
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can mark their attendance" ON public.attendance_records
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view course attendance" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      JOIN public.courses c ON l.course_id = c.id
      WHERE l.id = attendance_records.lecture_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage course attendance" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lectures l
      JOIN public.courses c ON l.course_id = c.id
      WHERE l.id = attendance_records.lecture_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all attendance" ON public.attendance_records
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view children attendance" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = attendance_records.student_id
    )
  );

-- Parent-student links policies
CREATE POLICY "Parents can view their links" ON public.parent_student_links
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage all links" ON public.parent_student_links
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for lectures and attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.lectures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;

-- Insert default departments
INSERT INTO public.departments (name, code) VALUES
  ('Computer Science', 'CSE'),
  ('Electrical Engineering', 'EEE'),
  ('Business Administration', 'BBA'),
  ('Economics', 'ECO'),
  ('English', 'ENG');