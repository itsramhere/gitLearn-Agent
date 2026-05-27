import React, { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { navigate } from './utils/navigate';

function App() {
  const { auth } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
    };
  }, []);

  if (path === '/') {
    // If they are already authenticated and try to go to login, send them to dashboard
    if (auth.isAuthenticated) {
      // Use setTimeout to avoid updating state during an existing render cycle
      setTimeout(() => navigate('/dashboard'), 0);
      return null;
    }
    return <LoginPage />;
  }

  if (path === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  if (path === '/dashboard') {
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    );
  }

  // Fallback for unknown routes
  setTimeout(() => navigate('/'), 0);
  return null;
}

export default App;
