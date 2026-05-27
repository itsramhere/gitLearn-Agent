import React from 'react';

const GitLabLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 380 380" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M190.4 350.2L253.3 156.8H127.5L190.4 350.2Z" fill="#E24329"/>
    <path d="M190.4 350.2L127.5 156.8H24.8L190.4 350.2Z" fill="#FC6D26"/>
    <path d="M24.8 156.8L5.1 217.5C3.3 223 5.2 229 9.9 232.5L190.4 350.2L24.8 156.8Z" fill="#FCA326"/>
    <path d="M24.8 156.8H127.5L84.2 23.6C82.1 17.1 72.9 17.1 70.8 23.6L24.8 156.8Z" fill="#E24329"/>
    <path d="M190.4 350.2L253.3 156.8H356L190.4 350.2Z" fill="#FC6D26"/>
    <path d="M356 156.8L375.7 217.5C377.5 223 375.6 229 370.9 232.5L190.4 350.2L356 156.8Z" fill="#FCA326"/>
    <path d="M356 156.8H253.3L296.6 23.6C298.7 17.1 307.9 17.1 310 23.6L356 156.8Z" fill="#E24329"/>
  </svg>
);

export const LoginPage: React.FC = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/auth/gitlab';
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/60 rounded-3xl p-10 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
          
          {/* Logo and Brand */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              GitLearn Agent
            </h1>
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Learn codebases. Solve real issues. Contribute with confidence.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            <span className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-medium">sign in</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>

          {/* GitLab OAuth Button */}
          <button
            onClick={handleLogin}
            className="group w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl bg-[#FC6D26] hover:bg-[#e85d1a] text-white font-semibold text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(252,109,38,0.3)] hover:shadow-[0_6px_30px_rgba(252,109,38,0.45)] hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#FC6D26]/50 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
          >
            <GitLabLogo className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            Continue with GitLab
          </button>

          {/* Privacy note */}
          <p className="text-center text-[11px] text-slate-500 mt-6 leading-relaxed">
            Your GitLab identity is used only to personalise your learning experience.
          </p>
        </div>

        {/* Footer branding */}
        <p className="text-center text-[10px] text-slate-700 mt-8 tracking-widest uppercase">
          Built for learners, by learners
        </p>
      </div>
    </div>
  );
};
