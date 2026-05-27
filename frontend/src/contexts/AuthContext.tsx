import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { navigate } from '../utils/navigate';

export interface AuthState {
  studentId: string;
  gitlabUsername: string;
  gitlabAvatarUrl: string;
  accessToken: string;
  isAuthenticated: boolean;
}

interface AuthContextValue {
  auth: AuthState;
  login: (data: Omit<AuthState, 'isAuthenticated'>) => void;
  logout: () => void;
}

const initialState: AuthState = {
  studentId: '',
  gitlabUsername: '',
  gitlabAvatarUrl: '',
  accessToken: '',
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(initialState);

  const login = useCallback((data: Omit<AuthState, 'isAuthenticated'>) => {
    setAuth({
      ...data,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    setAuth(initialState);
    navigate('/');
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
