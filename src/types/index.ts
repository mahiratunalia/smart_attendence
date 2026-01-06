// User Roles
export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';

// User Interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  studentId?: string;
  department?: string;
  createdAt: Date;
}

// Course Interface
export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  schedule: Schedule[];
  students: string[];
  section: string;
  semester: string;
}

export interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

// Lecture Interface
export interface Lecture {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  date: Date;
  startTime: string;
  endTime: string;
  room: string;
  teacherId: string;
  qrCode?: string;
  classroomCode?: string;
  codeExpiresAt?: Date;
  isActive: boolean;
  attendanceWindowMinutes: number;
}

// Attendance Interface
export interface AttendanceRecord {
  id: string;
  lectureId: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedAt?: Date;
  markedBy: 'qr' | 'code' | 'manual';
  ipAddress?: string;
}

// Attendance Summary
export interface AttendanceSummary {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalLectures: number;
  attended: number;
  percentage: number;
  isAtRisk: boolean;
}

// Notification Interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: Date;
  link?: string;
}

// Resource Interface
export interface Resource {
  id: string;
  courseId: string;
  lectureId?: string;
  title: string;
  description?: string;
  type: 'pdf' | 'ppt' | 'doc' | 'link' | 'video';
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  ratings: ResourceRating[];
  averageRating: number;
  downloadCount: number;
}

export interface ResourceRating {
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

// Leave Request Interface
export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  courseId?: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComment?: string;
  createdAt: Date;
}

// Message Interface
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientIds: string[];
  recipientType: 'individual' | 'class' | 'section';
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

// Calendar Event Interface
export interface CalendarEvent {
  id: string;
  title: string;
  type: 'lecture' | 'exam' | 'assignment' | 'holiday' | 'event';
  date: Date;
  startTime?: string;
  endTime?: string;
  description?: string;
  courseId?: string;
  isAttended?: boolean;
}

// Gamification Interface
export interface GamificationData {
  userId: string;
  points: number;
  streak: number;
  badges: Badge[];
  rank: number;
  level: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

// Audit Log Interface
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  ipAddress?: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  todayLectures: number;
  averageAttendance: number;
  atRiskStudents: number;
  pendingLeaves: number;
}

// Auth Context
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  studentId?: string;
  department?: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
