import React, { useState, useEffect } from 'react';
import { getRecommendedIssues, claimIssue } from '../services/api';

// Deterministic colour palette for label chips
const LABEL_COLORS = [
  { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/25' },
  { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/25' },
  { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/25' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/25' },
  { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/25' },
  { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/25' },
  { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', border: 'border-fuchsia-500/25' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/25' },
];

function getLabelColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

function truncate(text: string, maxLen: number) {
  if (!text) return '';
  // Strip markdown-style headings and HTML comments for a cleaner preview
  const cleaned = text.replace(/<!---[\s\S]*?--->/g, '').replace(/^#+\s.*/gm, '').trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trimEnd() + '…' : cleaned;
}

interface IssuesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  accessToken: string;
  onIssueClaimed: (issueId: string, issueTitle: string) => void;
}

export const IssuesPanel: React.FC<IssuesPanelProps> = ({ isOpen, onClose, studentId, accessToken, onIssueClaimed }) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchIssues();
    }
  }, [isOpen, studentId, accessToken]);

  const fetchIssues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecommendedIssues(studentId, accessToken);
      console.log('[IssuesPanel] Raw API Response for issues:', data);
      setIssues(data || []);
    } catch (err: any) {
      setError('Failed to fetch recommended issues from the server.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async (issueId: string, issueTitle: string) => {
    setClaimingId(issueId);
    setError(null);
    try {
      await claimIssue(studentId, accessToken, issueId);
      onIssueClaimed(issueId, issueTitle);
      onClose();
    } catch (err: any) {
      setError('Failed to claim the issue. Please try again.');
      console.error(err);
    } finally {
      setClaimingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 animate-slideInRight">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/60 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30">
          <div>
            <h2 className="text-xl font-semibold text-slate-100 tracking-wide flex items-center gap-2.5">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Recommended Issues
            </h2>
            <p className="text-xs text-slate-400 mt-1">Curated specifically for your skill level and goals.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-60 space-y-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 font-medium">Analyzing your profile…</p>
                <p className="text-xs text-slate-500 mt-1 animate-pulse">Matching issues to your skill level</p>
              </div>
            </div>
          ) : issues.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4">
              <svg className="w-14 h-14 text-slate-700/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-slate-400 font-medium">No matching issues found right now.</p>
              <p className="text-xs text-slate-500 mt-1.5">Check back later or adjust your goals.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {issues.map((issue, idx) => {
                const issueId = issue.id || issue.gitlabIssueId;
                const isClaiming = claimingId === issueId;

                return (
                  <div 
                    key={issueId || idx} 
                    className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden hover:border-slate-600/60 transition-all duration-300 shadow-sm hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)] group"
                  >
                    {/* Card Body */}
                    <div className="p-5">
                      {/* Title + ID */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-slate-200 font-semibold leading-snug group-hover:text-indigo-300 transition-colors text-[15px]">
                          {issue.title || 'Untitled Issue'}
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900/80 text-slate-500 border border-slate-700/60 flex-shrink-0 mt-0.5">
                          #{issueId}
                        </span>
                      </div>

                      {/* Description preview */}
                      {issue.description && (
                        <p className="text-[13px] text-slate-400/80 leading-relaxed mb-3.5 line-clamp-3">
                          {truncate(issue.description, 200)}
                        </p>
                      )}

                      {/* Label Chips */}
                      {issue.labels && issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {issue.labels.slice(0, 6).map((label: string, i: number) => {
                            const color = getLabelColor(label);
                            return (
                              <span 
                                key={i} 
                                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${color.bg} ${color.text} border ${color.border}`}
                              >
                                {label}
                              </span>
                            );
                          })}
                          {issue.labels.length > 6 && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-700/30 text-slate-500 border border-slate-700/40">
                              +{issue.labels.length - 6} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Reasoning Box */}
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3.5 mb-4">
                        <div className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Why this is right for you
                        </div>
                        <p className="text-[13px] text-slate-300/90 leading-relaxed">
                          {issue.reasoning || 'This issue aligns well with your current skill level and learning goals.'}
                        </p>
                      </div>

                      {/* Claim Button */}
                      <button
                        onClick={() => handleClaim(issueId, issue.title || 'Untitled Issue')}
                        disabled={claimingId !== null}
                        className="w-full py-2.5 px-4 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600 hover:text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600/10 disabled:hover:text-indigo-400 disabled:hover:shadow-none"
                      >
                        {isClaiming ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Claiming…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Claim This Issue
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
