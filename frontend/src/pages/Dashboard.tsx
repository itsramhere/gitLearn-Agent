import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatPanel } from '../components/ChatPanel';
import { IssuesView } from '../components/IssuesView';
import { ConceptMapView } from '../components/ConceptMapView';
import { ProgressView } from '../components/ProgressView';
import { ProfileView } from '../components/ProfileView';
import { OnboardingForm } from '../components/OnboardingForm';
import { useStudentData } from '../hooks/useStudentData';
import type { ChatMessage } from '../types';
import { sendMessage, solveIssue, releaseIssue } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type ViewMode = 'chat' | 'issues' | 'concept-map' | 'progress' | 'profile';

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
    setViewMode('chat');
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

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="flex h-screen bg-[#000000] items-center justify-center flex-col gap-4">
        <div className="w-10 h-10 border-4 border-[#d4a574]/20 border-t-[#d4a574] rounded-full animate-spin" />
        <div className="text-[#d4a574] font-medium tracking-wider animate-pulse text-sm">Loading Workspace…</div>
      </div>
    );
  }

  // Onboarding
  if (data && data.profile && data.profile.domain === '') {
    return (
      <OnboardingForm
        studentId={auth.studentId}
        accessToken={auth.accessToken}
        onComplete={() => refresh(true)}
      />
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex h-screen bg-[#000000] items-center justify-center p-6">
        <div className="max-w-md text-center p-8 bg-[#2a2018] border border-rose-500/30 rounded-2xl shadow-2xl">
          <svg className="w-12 h-12 text-rose-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-xl font-semibold text-[#e8dcc8] mb-2">Connection Error</h2>
          <p className="text-[#9a8b78] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  /* ── Render the active content view ── */
  const renderContent = () => {
    switch (viewMode) {
      case 'issues':
        return (
          <IssuesView
            studentId={auth.studentId}
            accessToken={auth.accessToken}
            onBack={() => setViewMode('chat')}
            onIssueClaimed={handleIssueClaimed}
          />
        );
      case 'concept-map':
        return data ? (
          <ConceptMapView
            conceptMap={data.conceptMap}
            onBack={() => setViewMode('chat')}
          />
        ) : null;
      case 'progress':
        return (
          <ProgressView
            claimedIssue={data?.claimedIssue || null}
            onBack={() => setViewMode('chat')}
            onSolveIssue={handleSolveIssue}
            onForfeitIssue={handleForfeitIssue}
          />
        );
      case 'profile':
        return data ? (
          <ProfileView
            profile={data.profile}
            onBack={() => setViewMode('chat')}
          />
        ) : null;
      case 'chat':
      default:
        return (
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onNavigate={setViewMode}
            gitlabUsername={auth.gitlabUsername}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#000000] overflow-hidden font-sans">
      {/* Sidebar */}
      {data && (
        <Sidebar
          activeView={viewMode}
          onNavigate={setViewMode}
          claimedIssue={data.claimedIssue}
          onSolveIssue={handleSolveIssue}
          onForfeitIssue={handleForfeitIssue}
          gitlabUsername={auth.gitlabUsername}
          gitlabAvatarUrl={auth.gitlabAvatarUrl}
          onLogout={logout}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Repo URL header */}
        <div className="h-12 bg-[#000000] border-b border-[#2e2219] flex items-center px-5 flex-shrink-0 z-20">
          <div className="flex-1 max-w-2xl relative flex items-center group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-3.5 h-3.5 text-[#6b5d4f] group-focus-within:text-[#d4a574] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full bg-transparent text-[#9a8b78] text-[13px] font-medium rounded-lg pl-9 pr-4 py-1.5 border border-transparent focus:outline-none focus:border-[#3d2e1f] hover:text-[#e8dcc8] transition-all"
              placeholder="Target Repository URL"
            />
          </div>
        </div>

        {/* Active view */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
