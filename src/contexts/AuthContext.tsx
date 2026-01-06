import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Auth Check - Token exists:', !!token);
    
    if (token) {
      try {
        api.setToken(token);
        const result = await api.getCurrentUser();
        console.log('👤 Current user result:', result);
        
        if (result.success && result.data) {
          setUser(result.data);
          console.log('✅ User authenticated:', result.data.email, 'Role:', result.data.role);
        } else {
          console.log('❌ Auth check failed, clearing token');
          localStorage.removeItem('token');
          api.setToken(null);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        localStorage.removeItem('token');
        api.setToken(null);
      }
    } else {
      console.log('ℹ️ No token found');
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    console.log('=== LOGIN FLOW START ===');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    
    try {
      console.log('📡 Calling API login...');
      const result = await api.login(email, password);
      console.log('📊 API Response:', JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        const { token, user: userData } = result.data;
        console.log('🎫 Token received:', token ? 'Yes' : 'No');
        console.log('👤 User data:', userData);
        
        localStorage.setItem('token', token);
        api.setToken(token);
        setUser(userData);
        
        console.log('✅ Login successful!');
        console.log('=== LOGIN FLOW END (SUCCESS) ===');
        return { success: true };
      } else {
        console.log('❌ Login failed:', result.message);
        console.log('=== LOGIN FLOW END (FAILED) ===');
        return { success: false, message: result.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('💥 Login exception:', error);
      console.log('=== LOGIN FLOW END (ERROR) ===');
      return { 
        success: false, 
        message: error.message || 'Connection error. Please ensure backend is running.' 
      };
    }
  };

  const logout = () => {
    console.log('👋 Logging out');
    localStorage.removeItem('token');
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
