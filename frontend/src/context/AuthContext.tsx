import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string, mobileNumber?: string) => Promise<User>;
  register: (email: string, password?: string, full_name?: string, mobileNumber?: string) => Promise<User>;
  logout: () => void;
  updateProfile: (fullName?: string, password?: string, mobileNumber?: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const currentUser = await apiRequest<User>('/auth/me');
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleSessionExpired = () => {
      setUser(null);
      alert('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password?: string, mobileNumber?: string): Promise<User> => {
    const tokens = await apiRequest<{ access_token: string; refresh_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        ...(password && { password }),
        ...(mobileNumber && { mobile_number: mobileNumber })
      }),
      skipAuth: true,
    });
    
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    
    const currentUser = await apiRequest<User>('/auth/me');
    setUser(currentUser);
    return currentUser;
  };

  const register = async (email: string, password?: string, full_name?: string, mobileNumber?: string): Promise<User> => {
    const newUser = await apiRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, mobile_number: mobileNumber }),
      skipAuth: true,
    });
    return newUser;
  };

  const logout = () => {
    apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const updateProfile = async (fullName?: string, password?: string, mobileNumber?: string): Promise<User> => {
    const updatedUser = await apiRequest<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({
        ...(fullName && { full_name: fullName }),
        ...(password && { password }),
        ...(mobileNumber && { mobile_number: mobileNumber }),
      }),
    });
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
