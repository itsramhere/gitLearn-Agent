import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatPanel } from '../components/ChatPanel';
import { IssuesView } from '../components/IssuesView';
import { OnboardingForm } from '../components/OnboardingForm';
import { useStudentData } from '../hooks/useStudentData';
import type { ChatMessage } from '../types';
import { sendMessage, solveIssue, releaseIssue } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type ViewMode = 'chat' | 'issues';

export const Dashboard: React.FC = () => {
  const { auth, logout } = useAuth();
  const { data, isLoading, error, refresh } = useStudentData(auth.studentId, auth.accessToken);
  const [repoUrl, setRepoUrl] = useState('https://gitlab.com/gitlab-org/cli');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  const hasActiveClaim = !!(data?.claimedIssue);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const agentResponseContent = await sendMessage(auth.studentId, auth.accessToken, content, repoUrl);
      const agentMessage: ChatMessage = { role: 'agent', content: agentResponseContent, timestamp: new Date() };
      setMessages((prev) => [...prev, agentMessage]);
      refresh(true);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = { role: 'agent', content: 'Sorry, I encountered an error while communicating with the server. Please try again.', timestamp: new Date() };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleIssueClaimed = (issueId: string, issueTitle: string) => {
    const claimMsg: ChatMessage = {
      role: 'agent',
      content: `🎉 You have claimed issue #${issueId}: **${issueTitle}**. Your claim is active for 48 hours. Good luck!`,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, claimMsg]);
    refresh(true);
  };

  const handleSolveIssue = async (issueId: string, prUrl: string) => {
    try {
      await solveIssue(auth.studentId, auth.accessToken, issueId, prUrl);
      const msg: ChatMessage = {
        role: 'agent',
        content: `✅ Issue #${issueId} has been marked as solved! Great work. Do you have any tips or gotchas you learned that might help the next student who tackles a similar issue?`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, msg]);
      refresh(true);
    } catch (err) {
      console.error('Failed to solve issue:', err);
    }
  };

  const handleForfeitIssue = async (issueId: string) => {
    try {
      await releaseIssue(auth.studentId, auth.accessToken, issueId);
      const msg: ChatMessage = {
        role: 'agent',
        content: `Issue #${issueId} released back to the pool. Ready to find a new one?`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, msg]);
      refresh(true);
    } catch (err) {
      console.error('Failed to forfeit issue:', err);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-screen bg-black items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="text-indigo-400 font-medium tracking-wider animate-pulse">Loading Workspace...</div>
      </div>
    );
  }

  if (data && data.profile && data.profile.domain === '') {
    return (
      <OnboardingForm 
        studentId={auth.studentId} 
        accessToken={auth.accessToken} 
        onComplete={() => refresh(true)} 
      />
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-screen bg-black items-center justify-center p-6">
        <div className="max-w-md text-center p-8 bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl">
          <svg className="w-12 h-12 text-rose-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">Connection Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="h-16 bg-black backdrop-blur-md border-b border-slate-800/60 flex items-center px-6 justify-between flex-shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </div>
          <span className="text-slate-100 font-bold tracking-wide text-lg">GitLearn</span>
        </div>
        
        <div className="flex-1 max-w-2xl mx-6">
          <div className="relative flex items-center group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <input 
              type="text" 
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full bg-black text-slate-200 text-sm font-medium rounded-lg pl-10 pr-4 py-2 border border-transparent focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-slate-700/50"
              placeholder="Target Repository URL (e.g. https://gitlab.com/gitlab-org/cli)"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <span className="text-sm font-medium text-slate-300">{auth.gitlabUsername}</span>
           <img 
             src={auth.gitlabAvatarUrl} 
             alt="Profile" 
             className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 object-cover"
           />
           <button 
             onClick={logout}
             className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
             title="Logout"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {data && (
          <Sidebar 
            profile={data.profile} 
            conceptMap={data.conceptMap} 
            claimedIssue={data.claimedIssue}
            onFindIssues={() => setViewMode('issues')}
            hasActiveClaim={hasActiveClaim}
            onSolveIssue={handleSolveIssue}
            onForfeitIssue={handleForfeitIssue}
          />
        )}
        
        <div className="flex-1 flex">
          {viewMode === 'chat' ? (
            <ChatPanel 
              messages={messages} 
              onSendMessage={handleSendMessage}
            />
          ) : (
            <IssuesView
              studentId={auth.studentId}
              accessToken={auth.accessToken}
              onBack={() => setViewMode('chat')}
              onIssueClaimed={handleIssueClaimed}
            />
          )}
        </div>
      </div>
    </div>
  );
};
