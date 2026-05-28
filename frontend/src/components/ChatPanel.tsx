import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onOpenIssues?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, onOpenIssues }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages or sending status changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    
    const msg = inputValue.trim();
    setInputValue(''); // Optimistically clear input
    setIsSending(true);
    
    try {
      await onSendMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-black bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] relative">
      {/* Header with Find Issue button */}
      <div className="flex-none p-4 sm:p-6 pb-2 flex justify-end z-20">
        <button
          onClick={onOpenIssues}
          className="px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Find Me An Issue
        </button>
      </div>

      {/* Top Gradient Overlay for smooth scroll fading */}
      <div className="absolute top-16 left-0 right-0 h-6 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar pt-8 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500/50">
            <p className="text-[11px] tracking-widest uppercase font-semibold">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 transition-all duration-300 transform translate-y-0 opacity-100 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-[0_4px_20px_rgba(37,99,235,0.15)]' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm shadow-md border border-slate-700/40'
                }`}
              >
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</div>
                <div 
                  className={`text-[10px] mt-2 font-medium tracking-wide ${
                    msg.role === 'user' ? 'text-blue-200/80 text-right' : 'text-slate-500'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-6 py-4 shadow-md border border-slate-700/40">
              <div className="flex space-x-1.5 items-center h-4">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black backdrop-blur-md border-t border-slate-800/40 z-20">
        <div className="max-w-4xl mx-auto relative flex items-center group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isSending}
            className="w-full bg-black text-slate-200 text-sm placeholder-slate-500/70 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 border border-slate-700/40 hover:border-slate-600 transition-colors shadow-sm disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="absolute right-2.5 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-indigo-500/10 disabled:hover:text-indigo-400 focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-500/50 font-medium">GitLearn Agent may make mistakes. Always verify code.</span>
        </div>
      </div>
    </div>
  );
};
