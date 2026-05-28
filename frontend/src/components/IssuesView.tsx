import React, { useState, useEffect } from 'react';
import { getRecommendedIssues, claimIssue } from '../services/api';

// Muted, desaturated deterministic colour palette for label chips
const LABEL_COLORS = [
  { bg: 'bg-violet-500/10', text: 'text-violet-400/80', border: 'border-violet-500/20' },
  { bg: 'bg-sky-500/10', text: 'text-sky-400/80', border: 'border-sky-500/20' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400/80', border: 'border-emerald-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400/80', border: 'border-rose-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400/80', border: 'border-amber-500/20' },
  { bg: 'bg-slate-500/10', text: 'text-slate-400/80', border: 'border-slate-500/20' },
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
    <div className="flex-1 flex flex-col h-full bg-black overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-800/60 bg-black flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Chat
        </button>
      </div>

      {/* Title area */}
      <div className="px-8 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-lg font-medium text-slate-300 flex items-center gap-2.5">
          <span className="text-purple-400/80">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </span>
          Recommended Issues For You
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 ml-[30px]">Based on your profile and concept map</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/5 border-l-2 border-l-rose-500/30 text-rose-400/90 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-5">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-purple-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-purple-400/60 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm">Analyzing your profile…</p>
            </div>
          </div>
        ) : issues.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <svg className="w-12 h-12 text-slate-700/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-slate-400 font-medium">No matching issues found</p>
            <p className="text-[13px] text-slate-500 mt-1 max-w-sm">We couldn't find issues matching your profile right now. Check back later.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {issues.map((issue, idx) => {
              const issueId = issue.id || issue.gitlabIssueId;
              const isClaiming = claimingId === issueId;
              
              // Label prioritisation
              const priorityLabels = ['good first issue', 'enhancement'];
              const sortedLabels = [...(issue.labels || [])].sort((a, b) => {
                const aPrio = priorityLabels.some(p => a.toLowerCase().includes(p)) ? 1 : 0;
                const bPrio = priorityLabels.some(p => b.toLowerCase().includes(p)) ? 1 : 0;
                return bPrio - aPrio;
              });
              const visibleLabels = sortedLabels.slice(0, 3);
              const hiddenCount = sortedLabels.length - 3;

              return (
                <div
                  key={issueId || idx}
                  className="bg-black border-y-0 border-r-0 border-l-[3px] border-l-purple-500/40 rounded-xl p-8 hover:bg-slate-900/50 transition-colors group relative"
                >
                  {/* Issue number + title */}
                  <div className="flex flex-col gap-1 mb-4">
                    <span className="text-[11px] font-mono text-slate-500">
                      #{issueId}
                    </span>
                    <h2 className="text-lg font-medium text-slate-200 leading-snug group-hover:text-purple-300 transition-colors">
                      {issue.title || 'Untitled Issue'}
                    </h2>
                  </div>

                  {/* Label chips */}
                  {visibleLabels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {visibleLabels.map((label: string, i: number) => {
                        const color = getLabelColor(label);
                        return (
                          <span
                            key={i}
                            className={`px-2 py-0.5 text-[11px] rounded-md ${color.bg} ${color.text} border ${color.border}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                      {hiddenCount > 0 && (
                        <span className="px-2 py-0.5 text-[11px] rounded-md bg-slate-800/40 text-slate-500 border border-slate-700/30">
                          +{hiddenCount} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description preview */}
                  {issue.description && (
                    <p className="text-[13px] text-slate-400/90 leading-relaxed mb-6">
                      {truncateDescription(issue.description, 250)}
                    </p>
                  )}

                  {/* Reasoning area (subtle left border) */}
                  <div className="pl-4 border-l-2 border-slate-700/50 mb-6">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Why this matches you
                    </div>
                    <p className="text-xs text-slate-400/80 leading-loose">
                      {issue.reasoning || 'This issue aligns well with your current skill level and learning goals.'}
                    </p>
                  </div>

                  {/* Claim button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleClaim(issueId, issue.title || 'Untitled Issue')}
                      disabled={claimingId !== null}
                      className="w-[180px] py-2 px-4 rounded-lg bg-slate-800/80 text-purple-300/90 font-medium text-sm hover:bg-slate-700 hover:text-purple-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800/80 disabled:active:scale-100"
                    >
                      {isClaiming ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
                          Claiming…
                        </>
                      ) : (
                        <>
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
  );
};
