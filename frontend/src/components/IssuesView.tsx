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

function truncateDescription(text: string, maxLen: number) {
  if (!text) return '';
  const cleaned = text.replace(/<!---[\s\S]*?--->/g, '').replace(/^#+\s.*/gm, '').trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trimEnd() + '…' : cleaned;
}

interface IssuesViewProps {
  studentId: string;
  accessToken: string;
  onBack: () => void;
  onIssueClaimed: (issueId: string, issueTitle: string) => void;
}

export const IssuesView: React.FC<IssuesViewProps> = ({ studentId, accessToken, onBack, onIssueClaimed }) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, [studentId, accessToken]);

  const fetchIssues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRecommendedIssues(studentId, accessToken);
      console.log('[IssuesView] Raw API Response for issues:', data);
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
      onBack(); // Navigate back to chat automatically
    } catch (err: any) {
      setError('Failed to claim the issue. Please try again.');
      console.error(err);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0f172a] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-800/60 bg-slate-950/40 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Chat
        </button>
      </div>

      {/* Title area */}
      <div className="px-8 pt-7 pb-5 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </span>
          Recommended Issues For You
        </h1>
        <p className="text-sm text-slate-400 mt-2 ml-11">Based on your profile and concept map</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/8 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-5">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">Analyzing your profile…</p>
              <p className="text-xs text-slate-500 mt-1.5 animate-pulse">Finding the best matching issues for your skill level</p>
            </div>
          </div>
        ) : issues.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <svg className="w-16 h-16 text-slate-700/40 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-slate-400 font-semibold text-lg">No matching issues found</p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">We couldn't find issues matching your profile right now. Check back later or explore the codebase to expand your concept map.</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl">
            {issues.map((issue, idx) => {
              const issueId = issue.id || issue.gitlabIssueId;
              const isClaiming = claimingId === issueId;

              return (
                <div
                  key={issueId || idx}
                  className="bg-slate-800/25 border border-slate-700/40 rounded-2xl p-7 hover:border-slate-600/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 group"
                >
                  {/* Issue number + title */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-slate-900/80 text-slate-400 border border-slate-700/60 flex-shrink-0 mt-1">
                      #{issueId}
                    </span>
                    <h2 className="text-lg font-semibold text-slate-200 leading-snug group-hover:text-indigo-300 transition-colors">
                      {issue.title || 'Untitled Issue'}
                    </h2>
                  </div>

                  {/* Label chips */}
                  {issue.labels && issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 ml-0">
                      {issue.labels.map((label: string, i: number) => {
                        const color = getLabelColor(label);
                        return (
                          <span
                            key={i}
                            className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full ${color.bg} ${color.text} border ${color.border}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Description preview */}
                  {issue.description && (
                    <p className="text-[13.5px] text-slate-400/85 leading-relaxed mb-5">
                      {truncateDescription(issue.description, 250)}
                    </p>
                  )}

                  {/* Reasoning box */}
                  <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 mb-5">
                    <div className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Why this matches you
                    </div>
                    <p className="text-[13.5px] text-slate-300/90 leading-relaxed">
                      {issue.reasoning || 'This issue aligns well with your current skill level and learning goals.'}
                    </p>
                  </div>

                  {/* Claim button */}
                  <button
                    onClick={() => handleClaim(issueId, issue.title || 'Untitled Issue')}
                    disabled={claimingId !== null}
                    className="w-full py-3 px-5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 disabled:hover:shadow-none disabled:active:scale-100"
                  >
                    {isClaiming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Claiming…
                      </>
                    ) : (
                      <>
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Claim This Issue
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
