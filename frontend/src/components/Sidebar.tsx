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

const CollapsiblePanel = ({ title, children, defaultOpen = true, summary }: { title: string, children: React.ReactNode, defaultOpen?: boolean, summary?: string }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-slate-800/40">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 text-slate-200 hover:bg-slate-800/20 transition-all duration-200 focus:outline-none"
      >
        <div className="flex flex-col items-start text-left">
          <span className="font-semibold text-[10px] tracking-wider uppercase text-slate-500">{title}</span>
          {!isOpen && summary && <span className="text-xs text-slate-400 mt-0.5">{summary}</span>}
        </div>
        <svg 
          className={`w-4 h-4 text-slate-500 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4">{children}</div>
      </div>
    </div>
  );
};

const getSkillBadge = (level: number | string) => {
  const normalized = typeof level === 'string' ? level.toLowerCase().trim() : level;
  if (normalized === 'advanced' || (typeof normalized === 'number' && normalized >= 4)) {
    return (
      <span className="flex items-center gap-1.5 text-slate-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Advanced
      </span>
    );
  }
  if (normalized === 'intermediate' || (typeof normalized === 'number' && normalized === 3)) {
    return (
      <span className="flex items-center gap-1.5 text-slate-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        Intermediate
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-slate-300">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
      Beginner
    </span>
  );
};

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
        minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      });
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return <span className="text-xs text-slate-500">Calculating...</span>;

  return (
    <span className="font-mono text-xs font-medium text-slate-300 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-700/40">
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
    <aside className="w-[300px] flex-shrink-0 h-screen bg-black border-r border-slate-800/40 overflow-y-auto flex flex-col z-10 custom-scrollbar">
      
      {/* Header Area */}
      <div className="p-5 border-b border-slate-800/40 bg-transparent flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        </div>
        <div>
          <h1 className="text-slate-200 font-semibold tracking-wide text-[13px]">GitLearn Agent</h1>
          <p className="text-[10px] text-slate-500 font-medium">Student Dashboard</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Student Profile Panel */}
        <CollapsiblePanel title="Student Profile">
          <div className="space-y-3">
            <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">{profile.domain || 'General'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>{profile.yearsOfExperience}y exp</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              {getSkillBadge(profile.inferredSkillLevel)}
            </div>
            
            {profile.goals && (
              <div className="pt-1">
                <div className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Primary Goals</div>
                <ul className="space-y-1">
                  {(Array.isArray(profile.goals) ? profile.goals : [profile.goals]).map((goal, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug">
                      <svg className="w-3 h-3 text-purple-400/80 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsiblePanel>

        {/* Concept Map Panel */}
        <CollapsiblePanel 
          title="Concept Map" 
          summary={`${conceptMap.filesExplained.length} files explored, ${conceptMap.conceptsUnderstood.length} concepts understood`}
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Files Explored</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conceptMap.filesExplained.length > 0 ? (
                  conceptMap.filesExplained.map((file, i) => (
                    <span key={i} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 border border-slate-700/30 font-mono truncate max-w-full">
                      {file}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-600 italic">No files explained yet</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3 h-3 text-emerald-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Concepts Understood</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conceptMap.conceptsUnderstood.length > 0 ? (
                  conceptMap.conceptsUnderstood.map((concept, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-500/5 text-emerald-400/90 border border-emerald-500/20">
                      {concept}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-600 italic">No concepts analyzed</span>
                )}
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3 h-3 text-rose-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Concepts Confused</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conceptMap.conceptsConfused.length > 0 ? (
                  conceptMap.conceptsConfused.map((concept, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] font-medium rounded bg-rose-500/5 text-rose-400/90 border border-rose-500/20">
                      {concept}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-600 italic">No confusion detected</span>
                )}
              </div>
            </div>
          </div>
        </CollapsiblePanel>

        {/* Find Issues Button */}
        <div className="px-4 py-3 border-b border-slate-800/40">
          <div className="relative group">
            <button
              onClick={onFindIssues}
              disabled={hasActiveClaim}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-xs transition-all duration-200 ${
                hasActiveClaim
                  ? 'bg-transparent text-slate-600 border border-slate-800 cursor-not-allowed'
                  : 'bg-transparent text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 active:scale-[0.98]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Find Issues For Me
            </button>
          </div>
        </div>

        {/* Active Issue Panel */}
        <CollapsiblePanel title="Active Issue">
          {!claimedIssue ? (
            <div className="text-[11px] text-slate-500 pb-2">
              No active issue
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              <div className="flex justify-between items-center">
                <div className="text-indigo-400 font-mono text-xs flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-indigo-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                  {claimedIssue.gitlabIssueId}
                </div>
                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                  {claimedIssue.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Time Left</div>
                <CountdownTimer expiresAt={claimedIssue.expiresAt} />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                {/* Mark as Solved */}
                {!showSolveForm && !showForfeitConfirm && (
                  <button
                    onClick={() => { setShowSolveForm(true); setShowForfeitConfirm(false); }}
                    className="flex-1 py-1.5 px-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-[11px] font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Solved
                  </button>
                )}
                
                {/* Forfeit Issue */}
                {!showForfeitConfirm && !showSolveForm && (
                  <button
                    onClick={() => { setShowForfeitConfirm(true); setShowSolveForm(false); }}
                    className="flex-1 py-1.5 px-2 rounded bg-rose-500/5 text-rose-400 border border-rose-500/15 hover:bg-rose-500/10 transition-all text-[11px] font-medium flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Forfeit
                  </button>
                )}
              </div>

              {/* Solve Form (inline) */}
              {showSolveForm && (
                <div className="bg-slate-900/80 border border-emerald-500/20 rounded p-2.5 space-y-2">
                  <div className="text-[9px] font-semibold text-emerald-400/70 uppercase tracking-wider">Submit PR URL</div>
                  <input
                    type="text"
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    placeholder="https://gitlab.com/.../merge_requests/..."
                    className="w-full bg-slate-800 text-slate-200 text-[10px] rounded px-2 py-1.5 border border-slate-700/50 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-slate-600"
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
                      className="flex-1 py-1 px-2 rounded bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {isSubmitting ? '...' : 'Submit'}
                    </button>
                    <button
                      onClick={() => { setShowSolveForm(false); setPrUrl(''); }}
                      className="py-1 px-2 rounded bg-slate-800 text-slate-400 text-[10px] font-medium hover:bg-slate-700 transition-colors border border-slate-700/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Forfeit Confirmation (inline) */}
              {showForfeitConfirm && (
                <div className="bg-slate-900/80 border border-rose-500/20 rounded p-2.5 space-y-2">
                  <p className="text-[10px] text-slate-400 leading-snug">Release this issue?</p>
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
                      className="flex-1 py-1 px-2 rounded bg-rose-600 text-white text-[10px] font-medium hover:bg-rose-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                    >
                      {isSubmitting ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowForfeitConfirm(false)}
                      className="py-1 px-2 rounded bg-slate-800 text-slate-400 text-[10px] font-medium hover:bg-slate-700 transition-colors border border-slate-700/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CollapsiblePanel>
      </div>
    </aside>
  );
};
