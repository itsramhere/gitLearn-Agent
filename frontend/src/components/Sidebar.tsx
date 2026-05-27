import React, { useState, useEffect } from 'react';
import type { StudentProfile, ConceptMap, ClaimedIssue } from '../types';

interface SidebarProps {
  profile: StudentProfile;
  conceptMap: ConceptMap;
  claimedIssue: ClaimedIssue | null;
  onFindIssues: () => void;
  hasActiveClaim: boolean;
  onSolveIssue: (issueId: string, prUrl: string) => void;
  onForfeitIssue: (issueId: string) => void;
}

const CollapsiblePanel = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-slate-800/50">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-5 text-slate-200 hover:bg-slate-800/30 transition-all duration-200 focus:outline-none"
      >
        <span className="font-medium text-xs tracking-widest uppercase text-slate-400">{title}</span>
        <svg 
          className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mb-5' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5">{children}</div>
      </div>
    </div>
  );
};

const getSkillBadge = (level: number | string) => {
  // Normalize: MongoDB may store this as a string like "advanced" or a number
  const normalized = typeof level === 'string' ? level.toLowerCase().trim() : level;

  if (normalized === 'advanced' || (typeof normalized === 'number' && normalized >= 4)) {
    return (
      <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)] backdrop-blur-sm">
        Advanced
      </span>
    );
  }
  if (normalized === 'intermediate' || (typeof normalized === 'number' && normalized === 3)) {
    return (
      <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)] backdrop-blur-sm">
        Intermediate
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)] backdrop-blur-sm">
      Beginner
    </span>
  );
};

const CountdownTimer = ({ expiresAt }: { expiresAt: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Ensure expiresAt is a Date object (in case it was serialized as a string from API)
      const exp = new Date(expiresAt);
      const diffMs = exp.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0 });
        return;
      }
      
      setTimeLeft({
        hours: Math.floor(diffMs / (1000 * 60 * 60)),
        minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      });
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return <span className="text-sm text-slate-500">Calculating...</span>;

  return (
    <span className="font-mono text-sm font-medium text-slate-300 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/50">
      {timeLeft.hours}h {timeLeft.minutes}m remaining
    </span>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ profile, conceptMap, claimedIssue, onFindIssues, hasActiveClaim, onSolveIssue, onForfeitIssue }) => {
  const [showSolveForm, setShowSolveForm] = useState(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <aside className="w-[320px] flex-shrink-0 h-screen bg-slate-950 border-r border-slate-800/60 overflow-y-auto flex flex-col shadow-xl z-10 custom-scrollbar">
      
      {/* Header Area */}
      <div className="p-6 border-b border-slate-800/60 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </div>
          <div>
            <h1 className="text-slate-100 font-semibold tracking-wide">GitLearn Agent</h1>
            <p className="text-xs text-slate-500 font-medium">Student Dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Student Profile Panel */}
        <CollapsiblePanel title="Student Profile">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1.5">Domain Focus</div>
              <div className="text-slate-200 text-sm">{profile.domain}</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-500">Experience</div>
              <div className="text-slate-200 text-sm font-medium">{profile.yearsOfExperience} years</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-500">Skill Level</div>
              <div>{getSkillBadge(profile.inferredSkillLevel)}</div>
            </div>
            
            {profile.goals && (
              <div className="pt-2">
                <div className="text-xs font-medium text-slate-500 mb-2">Primary Goals</div>
                <ul className="space-y-1.5">
                  {(Array.isArray(profile.goals) ? profile.goals : [profile.goals]).map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="leading-tight">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsiblePanel>

        {/* Concept Map Panel */}
        <CollapsiblePanel title="Concept Map">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div className="text-xs font-medium text-slate-500">Files Explained</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conceptMap.filesExplained.length > 0 ? (
                  conceptMap.filesExplained.map((file, i) => (
                    <span key={i} className="px-2 py-1 text-[11px] rounded bg-slate-800/80 text-slate-300 border border-slate-700/50 font-mono truncate max-w-full shadow-sm">
                      {file}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 italic">No files explained yet</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <div className="text-xs font-medium text-slate-500">Concepts Understood</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conceptMap.conceptsUnderstood.length > 0 ? (
                  conceptMap.conceptsUnderstood.map((concept, i) => (
                    <span key={i} className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 backdrop-blur-sm">
                      {concept}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 italic">No concepts analyzed</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-xs font-medium text-slate-500">Concepts Confused</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conceptMap.conceptsConfused.length > 0 ? (
                  conceptMap.conceptsConfused.map((concept, i) => (
                    <span key={i} className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 backdrop-blur-sm">
                      {concept}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600 italic">No confusion detected</span>
                )}
              </div>
            </div>
          </div>
        </CollapsiblePanel>

        {/* Find Issues Button */}
        <div className="px-5 py-4 border-b border-slate-800/50">
          <div className="relative group">
            <button
              onClick={onFindIssues}
              disabled={hasActiveClaim}
              className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                hasActiveClaim
                  ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-700/30'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_2px_15px_rgba(79,70,229,0.35)] hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)] hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.97]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Find Issues For Me
            </button>
            {hasActiveClaim && (
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-200 text-[10px] font-medium px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-amber-700/50 shadow-lg">
                Release your current issue first
              </span>
            )}
          </div>
        </div>

        {/* Active Issue Panel */}
        <CollapsiblePanel title="Active Issue">
          {!claimedIssue ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
              <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <div className="text-sm font-medium text-slate-400">No Active Claim</div>
              <p className="text-xs text-slate-500 mt-1 text-center">Claim an issue from the board to start working.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1.5">Issue ID</div>
                <div className="text-indigo-400 font-mono text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                  {claimedIssue.gitlabIssueId}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-500">Status</div>
                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] capitalize backdrop-blur-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  {claimedIssue.status}
                </span>
              </div>
              
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Time Remaining</div>
                <CountdownTimer expiresAt={claimedIssue.expiresAt} />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {/* Mark as Solved */}
                {!showSolveForm && !showForfeitConfirm && (
                  <button
                    onClick={() => { setShowSolveForm(true); setShowForfeitConfirm(false); }}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Mark as Solved
                  </button>
                )}

                {/* Solve Form (inline) */}
                {showSolveForm && (
                  <div className="bg-slate-900/80 border border-emerald-500/20 rounded-lg p-3 space-y-2.5">
                    <div className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider">Submit PR URL</div>
                    <input
                      type="text"
                      value={prUrl}
                      onChange={(e) => setPrUrl(e.target.value)}
                      placeholder="https://gitlab.com/.../merge_requests/..."
                      className="w-full bg-slate-800 text-slate-200 text-xs rounded-md px-3 py-2 border border-slate-700/50 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-slate-600 transition-all"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          console.log('Submit PR button clicked', prUrl);
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
                        className="flex-1 py-1.5 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Submitting…</>
                        ) : 'Submit'}
                      </button>
                      <button
                        onClick={() => { setShowSolveForm(false); setPrUrl(''); }}
                        className="py-1.5 px-3 rounded-md bg-slate-800 text-slate-400 text-xs font-medium hover:bg-slate-700 hover:text-slate-300 transition-colors border border-slate-700/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Forfeit Issue */}
                {!showForfeitConfirm && !showSolveForm && (
                  <button
                    onClick={() => { setShowForfeitConfirm(true); setShowSolveForm(false); }}
                    className="w-full py-2 px-3 rounded-lg bg-rose-500/8 text-rose-400 border border-rose-500/15 hover:bg-rose-500/15 hover:border-rose-500/25 transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Forfeit Issue
                  </button>
                )}

                {/* Forfeit Confirmation (inline) */}
                {showForfeitConfirm && (
                  <div className="bg-slate-900/80 border border-rose-500/20 rounded-lg p-3 space-y-2.5">
                    <p className="text-xs text-slate-300 leading-relaxed">Are you sure? This will release the issue back to the pool.</p>
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
                        className="flex-1 py-1.5 px-3 rounded-md bg-rose-600 text-white text-xs font-medium hover:bg-rose-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Releasing…</>
                        ) : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setShowForfeitConfirm(false)}
                        className="py-1.5 px-3 rounded-md bg-slate-800 text-slate-400 text-xs font-medium hover:bg-slate-700 hover:text-slate-300 transition-colors border border-slate-700/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CollapsiblePanel>
      </div>
    </aside>
  );
};
