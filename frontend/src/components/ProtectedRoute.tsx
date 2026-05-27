import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../utils/navigate';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useAuth();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/');
    }
  }, [auth.isAuthenticated]);

  if (!auth.isAuthenticated) {
    return null; // Return null while redirecting
  }

  return <>{children}</>;
};
