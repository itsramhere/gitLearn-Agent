import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

type ViewMode = 'chat' | 'issues' | 'concept-map' | 'progress' | 'profile';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onNavigate?: (view: ViewMode) => void;
  gitlabUsername?: string;
}

/* ── Quick-action pill button ── */
const QuickAction = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#3d2e1f] bg-[#2a2018]/40 text-[#9a8b78] text-[13px] font-medium hover:bg-[#2a2018] hover:text-[#e8dcc8] hover:border-[#4d3e2f] transition-all duration-200 active:scale-[0.97]"
  >
    <span className="w-4 h-4 flex items-center justify-center text-[#6b5d4f]">{icon}</span>
    {label}
  </button>
);

/* ── Greeting based on time of day ── */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, onNavigate, gitlabUsername }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    const msg = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    try {
      await onSendMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayName = gitlabUsername || 'there';

  /* ── Empty state (Claude-style greeting) ── */
  if (messages.length === 0 && !isSending) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#000000] relative">
        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeIn">
          {/* Sparkle icon */}
          <div className="mb-4">
            <svg className="w-10 h-10 text-[#d4a574]" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor" opacity="0.9" />
            </svg>
          </div>

          {/* Greeting */}
          <h1 className="text-[32px] font-semibold text-[#e8dcc8] tracking-tight mb-10">
            {getGreeting()}, {displayName}
          </h1>

          {/* Chat input (centered, wide) */}
          <div className="w-full max-w-2xl mb-5">
            <div className="relative bg-[#82DDF0] border border-[#82DDF0] rounded-2xl overflow-hidden shadow-lg shadow-black/20 transition-all focus-within:border-[#6bcbe0] focus-within:shadow-xl focus-within:shadow-black/30">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                rows={1}
                className="w-full bg-transparent text-black text-[15px] placeholder-black/60 pl-5 pr-14 pt-4 pb-4 focus:outline-none resize-none leading-relaxed"
                style={{ minHeight: '56px' }}
              />
              {/* Bottom bar inside input */}
              <div className="flex items-center justify-between px-3 pb-3">
                <button className="p-1.5 rounded-lg text-[#6b5d4f] hover:text-[#9a8b78] hover:bg-[#332818] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#6b5d4f] font-medium select-none">Gemini</span>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending}
                    className="p-2 rounded-xl bg-[#d4a574]/10 text-[#d4a574] hover:bg-[#d4a574] hover:text-[#000000] transition-all duration-200 disabled:opacity-20 disabled:hover:bg-[#d4a574]/10 disabled:hover:text-[#d4a574]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick-action pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <QuickAction
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
              label="Find Issues"
              onClick={() => onNavigate?.('issues')}
            />
            <QuickAction
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
              label="Explain Code"
              onClick={() => {
                setInputValue('Can you explain the codebase structure to me?');
                inputRef.current?.focus();
              }}
            />
            <QuickAction
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              label="My Progress"
              onClick={() => onNavigate?.('progress')}
            />
            <QuickAction
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
              label="Concept Map"
              onClick={() => onNavigate?.('concept-map')}
            />
            <QuickAction
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>}
              label="GitLearn's choice"
              onClick={() => {
                setInputValue('What should I learn next?');
                inputRef.current?.focus();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── Active chat view ── */
  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] relative">
      {/* Top gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#000000] to-transparent z-10 pointer-events-none" />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
            style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
          >
            <div
              className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-5 py-3.5 ${
                msg.role === 'user'
                  ? 'bg-[#d4a574] text-[#000000] rounded-br-md shadow-lg shadow-[#d4a574]/10'
                  : 'bg-[#2a2018] text-[#e8dcc8] rounded-bl-md shadow-md border border-[#3d2e1f]'
              }`}
            >
              <div className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`text-[10px] mt-2 font-medium tracking-wide ${
                  msg.role === 'user' ? 'text-[#000000]/50 text-right' : 'text-[#6b5d4f]'
                }`}
              >
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-[#2a2018] rounded-2xl rounded-bl-md px-6 py-4 shadow-md border border-[#3d2e1f]">
              <div className="flex space-x-1.5 items-center h-4">
                <div className="w-2 h-2 bg-[#6b5d4f] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-[#6b5d4f] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-[#6b5d4f] rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input area */}
      <div className="px-6 pb-4 pt-2 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-[#2a2018] border border-[#3d2e1f] rounded-2xl overflow-hidden transition-all focus-within:border-[#4d3e2f]">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isSending}
              rows={1}
              className="w-full bg-transparent text-[#e8dcc8] text-[14px] placeholder-[#6b5d4f] pl-5 pr-14 pt-3.5 pb-3.5 focus:outline-none resize-none disabled:opacity-50 leading-relaxed"
              style={{ minHeight: '48px' }}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <button className="p-1.5 rounded-lg text-[#6b5d4f] hover:text-[#9a8b78] hover:bg-[#332818] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#6b5d4f] font-medium select-none">Gemini</span>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isSending}
                  className="p-2 rounded-xl bg-[#d4a574]/10 text-[#d4a574] hover:bg-[#d4a574] hover:text-[#000000] transition-all duration-200 disabled:opacity-20 disabled:hover:bg-[#d4a574]/10 disabled:hover:text-[#d4a574]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-[#6b5d4f]/60 font-medium">GitLearn Agent may make mistakes. Always verify code.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
