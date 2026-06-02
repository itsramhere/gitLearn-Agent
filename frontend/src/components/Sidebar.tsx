import React, { useState, useEffect } from 'react';
import type { ClaimedIssue } from '../types';

type ViewMode = 'chat' | 'issues' | 'concept-map' | 'progress' | 'profile';

interface SidebarProps {
  activeView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  claimedIssue: ClaimedIssue | null;
  onSolveIssue: (issueId: string, prUrl: string) => void;
  onForfeitIssue: (issueId: string) => void;
  gitlabUsername?: string;
  gitlabAvatarUrl?: string;
  onLogout?: () => void;
}

/* ── Countdown timer ── */
const CountdownTimer = ({ expiresAt }: { expiresAt: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const exp = new Date(expiresAt);
      const diffMs = exp.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diffMs / (1000 * 60 * 60)),
        minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return <span className="text-xs text-[#A57548]">Calculating…</span>;

  return (
    <span className="font-mono text-xs font-medium text-[#d4a574] bg-[#2a2018] px-2 py-0.5 rounded border border-[#3d2e1f]">
      {timeLeft.hours}h {timeLeft.minutes}m left
    </span>
  );
};

/* ── Nav item ── */
const NavItem = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group
      ${active
        ? 'bg-[#2a2018] text-[#A57548]'
        : 'text-[#A57548] hover:bg-[#2a2018]/60 hover:text-[#A57548]'
      }`}
  >
    <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center transition-colors ${active ? 'text-[#d4a574]' : 'text-[#A57548] group-hover:text-[#A57548]'}`}>
      {icon}
    </span>
    {label}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  claimedIssue,
  onSolveIssue,
  onForfeitIssue,
  gitlabUsername,
  gitlabAvatarUrl,
  onLogout,
}) => {
  const [showSolveForm, setShowSolveForm] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <aside className="w-[260px] flex-shrink-0 h-screen bg-[#171310] border-r border-[#2e2219] flex flex-col z-10">
      
      {/* ─── Header ─── */}
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        <span className="text-[#A57548] font-semibold tracking-wide text-[15px]">GitLearn</span>
        <div className="flex items-center gap-1">
          {/* Search icon */}
          <button className="p-1.5 rounded-lg text-[#A57548] hover:text-[#A57548] hover:bg-[#2a2018] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          {/* New chat icon */}
          <button
            onClick={() => onNavigate('chat')}
            className="p-1.5 rounded-lg text-[#A57548] hover:text-[#A57548] hover:bg-[#2a2018] transition-colors"
            title="New chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        </div>
      </div>

      {/* ─── Navigation ─── */}
      <div className="px-3 flex-shrink-0">
        <button
          onClick={() => onNavigate('chat')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#A57548] hover:bg-[#2a2018]/60 hover:text-[#A57548] transition-all duration-150 mb-2"
        >
          <svg className="w-4 h-4 text-[#A57548]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New chat
        </button>
      </div>

      <div className="px-3 mb-2 flex-shrink-0">
        <div className="h-px bg-[#2e2219]" />
      </div>

      {/* Feature Nav */}
      <nav className="px-3 space-y-0.5 flex-shrink-0">
        <NavItem
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>}
          label="Issue Matcher"
          active={activeView === 'issues'}
          onClick={() => onNavigate('issues')}
        />
        <NavItem
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
          label="Code Explainer"
          active={false}
          onClick={() => onNavigate('chat')}
        />
        <NavItem
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
          label="Concept Map"
          active={activeView === 'concept-map'}
          onClick={() => onNavigate('concept-map')}
        />
        <NavItem
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          label="Progress Tracker"
          active={activeView === 'progress'}
          onClick={() => onNavigate('progress')}
        />
        <NavItem
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
          label="Profile"
          active={activeView === 'profile'}
          onClick={() => onNavigate('profile')}
        />
      </nav>

      {/* ─── Active Issue Section ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 mt-4">
        <div className="mb-2">
          <span className="text-[10px] font-semibold text-[#A57548] uppercase tracking-wider px-3">Active Issue</span>
        </div>

        {!claimedIssue ? (
          <div className="px-3 py-4">
            <p className="text-[12px] text-[#A57548] italic">No active issue claimed.</p>
            <button
              onClick={() => onNavigate('issues')}
              className="mt-2 text-[12px] text-[#d4a574] hover:text-[#e8b888] transition-colors font-medium"
            >
              Find an issue →
            </button>
          </div>
        ) : (
          <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-3.5 space-y-3 animate-fadeIn">
            {/* Issue ID & status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#d4a574] font-mono text-xs font-medium">
                <svg className="w-3.5 h-3.5 text-[#A57548]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                {claimedIssue.gitlabIssueId}
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#d4a574]/10 text-[#d4a574] border border-[#d4a574]/20 capitalize">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] animate-pulse" />
                {claimedIssue.status}
              </span>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#A57548] uppercase tracking-wider">Time Left</span>
              <CountdownTimer expiresAt={claimedIssue.expiresAt} />
            </div>

            {/* Action buttons */}
            <div className="pt-1 flex gap-2">
              {!showSolveForm && !showForfeitConfirm && (
                <>
                  <button
                    onClick={() => { setShowSolveForm(true); setShowForfeitConfirm(false); }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-[11px] font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Submit PR
                  </button>
                  <button
                    onClick={() => { setShowForfeitConfirm(true); setShowSolveForm(false); }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-rose-500/5 text-rose-400 border border-rose-500/15 hover:bg-rose-500/10 transition-all text-[11px] font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Forfeit
                  </button>
                </>
              )}
            </div>

            {/* Solve form (inline) */}
            {showSolveForm && (
              <div className="bg-[#000000] border border-emerald-500/20 rounded-lg p-2.5 space-y-2 animate-scaleIn">
                <div className="text-[9px] font-semibold text-emerald-400/70 uppercase tracking-wider">Submit PR URL</div>
                <input
                  type="text"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://gitlab.com/.../merge_requests/..."
                  className="w-full bg-[#2a2018] text-[#A57548] text-[10px] rounded-lg px-2 py-1.5 border border-[#3d2e1f] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#A57548]"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      if (!prUrl.trim() || !claimedIssue) return;
                      setIsSubmitting(true);
                      try {
                        await onSolveIssue(claimedIssue.gitlabIssueId, prUrl.trim());
                        setShowSolveForm(false);
                        setPrUrl('');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={!prUrl.trim() || isSubmitting}
                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '…' : 'Submit'}
                  </button>
                  <button
                    onClick={() => { setShowSolveForm(false); setPrUrl(''); }}
                    className="py-1 px-2 rounded-lg bg-[#2a2018] text-[#A57548] text-[10px] font-medium hover:bg-[#332818] transition-colors border border-[#3d2e1f]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Forfeit confirmation */}
            {showForfeitConfirm && (
              <div className="bg-[#000000] border border-rose-500/20 rounded-lg p-2.5 space-y-2 animate-scaleIn">
                <p className="text-[10px] text-[#A57548] leading-snug">Release this issue back?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      if (!claimedIssue) return;
                      setIsSubmitting(true);
                      try {
                        await onForfeitIssue(claimedIssue.gitlabIssueId);
                        setShowForfeitConfirm(false);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-1 px-2 rounded-lg bg-rose-600 text-white text-[10px] font-medium hover:bg-rose-500 transition-colors disabled:opacity-40"
                  >
                    {isSubmitting ? '…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowForfeitConfirm(false)}
                    className="py-1 px-2 rounded-lg bg-[#2a2018] text-[#A57548] text-[10px] font-medium hover:bg-[#332818] transition-colors border border-[#3d2e1f]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Footer (user) ─── */}
      <div className="p-3 border-t border-[#2e2219] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#2a2018] transition-colors cursor-pointer group">
          {gitlabAvatarUrl ? (
            <img
              src={gitlabAvatarUrl}
              alt="Profile"
              className="w-7 h-7 rounded-full bg-[#2a2018] border border-[#3d2e1f] object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#2a2018] border border-[#3d2e1f] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#A57548]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-medium text-[#A57548] truncate block">{gitlabUsername || 'User'}</span>
          </div>
          {onLogout && (
            <button
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
              className="p-1 rounded text-[#A57548] hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Logout"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
