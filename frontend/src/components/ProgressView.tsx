import React, { useState, useEffect } from 'react';
import type { ClaimedIssue } from '../types';

interface ProgressViewProps {
  claimedIssue: ClaimedIssue | null;
  onBack: () => void;
  onSolveIssue: (issueId: string, prUrl: string) => void;
  onForfeitIssue: (issueId: string) => void;
}

const CountdownTimer: React.FC<{ expiresAt: Date }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const exp = new Date(expiresAt);
      const diffMs = exp.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor(diffMs / (1000 * 60 * 60)),
        minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) {
    return <span className="text-[#6b5d4f] text-sm">Calculating...</span>;
  }

  const isExpired = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  const isLow = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <div className="flex items-center gap-3">
      {/* Hours */}
      <div className="flex flex-col items-center">
        <span className={`font-mono text-3xl font-bold tabular-nums ${isExpired ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-[#e8dcc8]'}`}>
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-[10px] text-[#6b5d4f] uppercase tracking-wider mt-1">Hours</span>
      </div>
      <span className={`text-2xl font-bold ${isExpired ? 'text-rose-400/50' : 'text-[#6b5d4f]'} -mt-4`}>:</span>
      {/* Minutes */}
      <div className="flex flex-col items-center">
        <span className={`font-mono text-3xl font-bold tabular-nums ${isExpired ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-[#e8dcc8]'}`}>
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-[10px] text-[#6b5d4f] uppercase tracking-wider mt-1">Mins</span>
      </div>
      <span className={`text-2xl font-bold ${isExpired ? 'text-rose-400/50' : 'text-[#6b5d4f]'} -mt-4`}>:</span>
      {/* Seconds */}
      <div className="flex flex-col items-center">
        <span className={`font-mono text-3xl font-bold tabular-nums ${isExpired ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-[#e8dcc8]'}`}>
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="text-[10px] text-[#6b5d4f] uppercase tracking-wider mt-1">Secs</span>
      </div>
    </div>
  );
};

export const ProgressView: React.FC<ProgressViewProps> = ({ claimedIssue, onBack, onSolveIssue, onForfeitIssue }) => {
  const [showSolveForm, setShowSolveForm] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#000000] overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex-none px-6 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#9a8b78] hover:text-[#d4a574] transition-colors text-sm font-medium group mb-6"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Chat
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#332818] border border-[#3d2e1f] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#d4a574]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-[#e8dcc8] text-xl font-semibold tracking-tight">Progress Tracker</h1>
            <p className="text-[#6b5d4f] text-xs mt-0.5">Track your active issue and deadline</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8">
        {!claimedIssue ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full -mt-16">
            <div className="w-20 h-20 rounded-2xl bg-[#2a2018] border border-[#3d2e1f] flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[#3d2e1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-[#e8dcc8] text-lg font-semibold mb-2">No Active Issue</h2>
            <p className="text-[#6b5d4f] text-sm text-center max-w-xs">
              You don't have an active issue right now. Go find one to start contributing!
            </p>
          </div>
        ) : (
          /* Active Issue */
          <div className="max-w-lg mx-auto space-y-5 pt-4">
            {/* Issue Card */}
            <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-6">
              {/* Issue ID + Status */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#d4a574]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-[#e8dcc8] font-mono text-lg font-semibold">{claimedIssue.gitlabIssueId}</span>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {claimedIssue.status}
                </span>
              </div>

              {/* Countdown */}
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider mb-3">Time Remaining</div>
                <div className="flex justify-center py-4 bg-[#171310] rounded-lg border border-[#3d2e1f]">
                  <CountdownTimer expiresAt={claimedIssue.expiresAt} />
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
              <div className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider mb-4">Actions</div>

              {/* Default buttons */}
              {!showSolveForm && !showForfeitConfirm && (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowSolveForm(true); setShowForfeitConfirm(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark as Solved
                  </button>
                  <button
                    onClick={() => { setShowForfeitConfirm(true); setShowSolveForm(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-rose-500/8 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 transition-all text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Forfeit Issue
                  </button>
                </div>
              )}

              {/* Solve Form */}
              {showSolveForm && (
                <div className="bg-[#171310] border border-emerald-500/20 rounded-lg p-4 space-y-3">
                  <div className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">Submit PR URL</div>
                  <input
                    type="text"
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    placeholder="https://gitlab.com/.../merge_requests/..."
                    className="w-full bg-[#2a2018] text-[#e8dcc8] text-sm rounded-lg px-3 py-2.5 border border-[#3d2e1f] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-[#6b5d4f] transition-colors"
                  />
                  <div className="flex gap-2">
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
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        'Submit'
                      )}
                    </button>
                    <button
                      onClick={() => { setShowSolveForm(false); setPrUrl(''); }}
                      className="py-2 px-4 rounded-lg bg-[#2a2018] text-[#9a8b78] text-sm font-medium hover:bg-[#332818] transition-colors border border-[#3d2e1f]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Forfeit Confirmation */}
              {showForfeitConfirm && (
                <div className="bg-[#171310] border border-rose-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-xs font-semibold text-rose-400/80 uppercase tracking-wider">Confirm Forfeit</span>
                  </div>
                  <p className="text-[#9a8b78] text-sm leading-relaxed">
                    Are you sure you want to release this issue? It will become available for other students.
                  </p>
                  <div className="flex gap-2">
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
                      className="flex-1 py-2 px-3 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        'Confirm Forfeit'
                      )}
                    </button>
                    <button
                      onClick={() => setShowForfeitConfirm(false)}
                      className="py-2 px-4 rounded-lg bg-[#2a2018] text-[#9a8b78] text-sm font-medium hover:bg-[#332818] transition-colors border border-[#3d2e1f]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
