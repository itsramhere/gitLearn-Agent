import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../utils/navigate';

export const AuthCallbackPage: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasHandled = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double-firing (React StrictMode or re-renders)
      if (hasHandled.current) return;
      hasHandled.current = true;

      // 1. Get the code from the URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        setError('No authorization code found in the URL.');
        return;
      }

      try {
        // 2. Exchange code for token and profile data via our backend
        const response = await fetch(`http://localhost:3000/auth/callback?code=${code}`);
        
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || `Server returned ${response.status}`);
        }

        const data = await response.json();

        // 3. Update auth context with the returned data
        login({
          studentId: data.studentId,
          gitlabUsername: data.gitlabUsername,
          gitlabAvatarUrl: data.gitlabAvatarUrl,
          accessToken: data.accessToken,
        });

        // 4. Redirect to the dashboard
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Failed to authenticate with GitLab.');
      }
    };

    handleCallback();
  }, [login]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Authentication Failed</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-16 h-16 relative mb-6">
        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Signing you in...</h2>
      <p className="text-slate-400 text-sm">Please wait while we securely connect to your GitLab account.</p>
    </div>
  );
};
