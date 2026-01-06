import { toast } from 'sonner';

// Determine API URL based on environment
// Use explicit 127.0.0.1 to match server binding
const API_URL = 'http://127.0.0.1:5001/api';

console.log('API Client configured with URL:', API_URL);

type ApiResult<T> = { success: boolean; data?: T; message?: string; error?: string };

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Try to recover token if window exists
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers as any,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        // Handle 401 Unauthorized globally if needed (e.g. redirect to login)
        if (response.status === 401 && !endpoint.includes('login')) {
          this.setToken(null);
          window.location.href = '/login';
        }
        return {
          success: false,
          message: data?.message || `Error: ${response.status}`,
          error: data?.error
        };
      }

      return { success: true, data: data?.data || data, message: data?.message };
    } catch (error: any) {
      console.error('API Request Failed:', error);
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        error: error.message,
      };
    }
  }

  // ---------------- Auth ----------------
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any) {
    console.log('API: Registering user', data.email);
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  // ---------------- Users ----------------
  async getUsers(role?: string, search?: string) {
    let query = new URLSearchParams();
    if (role) query.append('role', role);
    if (search) query.append('search', search);
    return this.request<any[]>(`/users?${query.toString()}`);
  }

  async updateUser(userId: string, data: any) {
    return this.request<any>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ---------------- Departments ----------------
  async getDepartments() {
    return this.request<any[]>('/departments');
  }

  async createDepartment(data: { name: string; code: string }) {
    return this.request<any>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: string) {
    return this.request<any>(`/departments/${id}`, { method: 'DELETE' });
  }

  // ---------------- Audit Logs ----------------
  async getAuditLogs(filters?: {
    userId?: string;
    studentId?: string;
    courseId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.append(key, value);
      });
    }
    const qs = query.toString();
    return this.request<any[]>(`/audit/logs${qs ? `?${qs}` : ''}`);
  }

  async getAuditFlags(params?: {
    windowDays?: number;
    frequentEditsThreshold?: number;
    presentChangesThreshold?: number;
    beforeExamHours?: number;
    beforeExamThreshold?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query.append(key, String(value));
      });
    }
    const qs = query.toString();
    return this.request<any[]>(`/audit/flags${qs ? `?${qs}` : ''}`);
  }

  // ---------------- Courses ----------------
  async getCourses() {
    return this.request<any[]>('/courses');
  }

  async enrollStudent(courseId: string, studentId: string) {
    return this.request<any>(`/courses/${courseId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  }

  async unenrollStudent(courseId: string, studentId: string) {
    return this.request<any>(`/courses/${courseId}/enroll/${studentId}`, {
      method: 'DELETE',
    });
  }

  // ---------------- Lectures ----------------
  async getLectures() {
    return this.request<any[]>('/lectures');
  }

  async updateLecture(id: string, data: any) {
    return this.request<any>(`/lectures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async startLectureSession(id: string) {
    return this.request<any>(`/lectures/${id}/session/start`, { method: 'POST' });
  }

  async updateLectureCodes(id: string, codes: any) {
    return this.request<any>(`/lectures/${id}/session/codes`, { 
      method: 'PUT',
      body: JSON.stringify(codes)
    });
  }

  async endLectureSession(id: string) {
    return this.request<any>(`/lectures/${id}/session/end`, { method: 'POST' });
  }

  // ---------------- Attendance ----------------
  async getAttendanceRecords(filters?: any) {
    let query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.append(key, value as string);
      });
    }
    return this.request<any[]>(`/attendance?${query.toString()}`);
  }
  
  async updateAttendance(id: string, status: string, reason: string) {
    return this.request<any>(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, correctionReason: reason }),
    });
  }

  async markAttendanceSecure(data: { lectureId: string; code?: string; qrToken?: string; markedBy: 'code' | 'qr' }) {
    return this.request<any>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({
        lectureId: data.lectureId,
        code: data.code,
        qrToken: data.qrToken,
        markedBy: data.markedBy,
      }),
    });
  }

  // ---------------- Messages ----------------
  async getMessages() {
    return this.request<any[]>('/messages');
  }

  async sendMessage(data: any) {
    return this.request<any>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessageAsRead(id: string) {
    return this.request<any>(`/messages/${id}/read`, { method: 'PUT' });
  }

  // ---------------- Notifications ----------------
  async getNotifications(unreadOnly?: boolean) {
    const query = unreadOnly ? '?unread_only=true' : '';
    return this.request<any[]>(`/notifications${query}`);
  }

  async markNotificationAsRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsAsRead() {
    return this.request<any>('/notifications/read-all', { method: 'PUT' });
  }

  async deleteNotification(id: string) {
    return this.request<any>(`/notifications/${id}`, { method: 'DELETE' });
  }

  // ---------------- Leave Requests ----------------
  async getLeaveRequests() {
    return this.request<any[]>('/leave-requests');
  }

  async createLeaveRequest(data: any) {
    return this.request<any>('/leave-requests', {
      method: 'POST',
      body: JSON.stringify({
        courseId: data.courseId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason
      }),
    });
  }

  async reviewLeaveRequest(id: string, status: string, reviewComment?: string) {
    return this.request<any>(`/leave-requests/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_comment: reviewComment }),
    });
  }

  // ---------------- Schedule ----------------
  async getSchedule(startDate: string, endDate: string) {
    return this.request<any[]>(`/schedules?start_date=${startDate}&end_date=${endDate}`);
  }

  // ---------------- Resources ----------------
  async getResources(courseId?: string) {
    const url = courseId ? `/resources?courseId=${courseId}` : '/resources';
    return this.request<any[]>(url);
  }

  async incrementResourceView(resourceId: string) {
    return this.request<any>(`/resources/${resourceId}/view`, {
      method: 'POST',
    });
  }

  async updateResource(id: string, data: any) {
    return this.request<any>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadResource(formData: FormData) {
    const url = `${this.baseUrl}/resources`;
    const headers: any = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    // Note: Do NOT set Content-Type header for FormData, browser does it automatically with boundary

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await response.json();
      return { success: response.ok, data: data.data || data, message: data.message };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async downloadResource(fileUrl: string, fileName: string) {
    try {
      // Construct the full URL for the file
      const url = fileUrl.startsWith('http') ? fileUrl : `${this.baseUrl.replace('/api', '')}${fileUrl}`;
      
      const response = await fetch(url, {
        headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
      });
      
      if (!response.ok) {
        return { success: false, message: 'Failed to download file' };
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async rateResource(resourceId: string, data: { rating: number; comment?: string }) {
    return this.request<any>(`/resource-ratings/${resourceId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_URL);
export type { ApiResult };