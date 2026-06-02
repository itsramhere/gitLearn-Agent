import React from 'react';
import type { ConceptMap } from '../types';

interface ConceptMapViewProps {
  conceptMap: ConceptMap;
  onBack: () => void;
}

export const ConceptMapView: React.FC<ConceptMapViewProps> = ({ conceptMap, onBack }) => {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 00-.659 1.59v1.69m-7.742 0h7.742m-7.742 0a2.25 2.25 0 01-.659-1.59v-1.69M5 14.5l2.47 2.47a2.25 2.25 0 01.659 1.59v1.69" />
            </svg>
          </div>
          <div>
            <h1 className="text-[#e8dcc8] text-xl font-semibold tracking-tight">Your Concept Map</h1>
            <p className="text-[#6b5d4f] text-xs mt-0.5">Track what you've explored and understood</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8 space-y-5">
        {/* Files Explored */}
        <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <svg className="w-4 h-4 text-[#9a8b78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-[#e8dcc8] text-sm font-semibold">Files Explored</h2>
            <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#332818] text-[#9a8b78] border border-[#3d2e1f] tabular-nums">
              {conceptMap.filesExplained.length}
            </span>
          </div>

          {conceptMap.filesExplained.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {conceptMap.filesExplained.map((file, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#332818] text-[#e8dcc8] text-xs font-mono border border-[#3d2e1f] hover:border-[#d4a574]/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[#9a8b78] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {file}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-10 h-10 text-[#3d2e1f] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-[#6b5d4f] text-sm">No files explored yet.</p>
              <p className="text-[#6b5d4f]/60 text-xs mt-1">Ask about a file to get started.</p>
            </div>
          )}
        </div>

        {/* Concepts Understood */}
        <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <svg className="w-4 h-4 text-emerald-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-[#e8dcc8] text-sm font-semibold">Concepts Understood</h2>
            <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
              {conceptMap.conceptsUnderstood.length}
            </span>
          </div>

          {conceptMap.conceptsUnderstood.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {conceptMap.conceptsUnderstood.map((concept, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/8 text-emerald-300 text-xs font-medium border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
                >
                  <svg className="w-3 h-3 text-emerald-400/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {concept}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-10 h-10 text-[#3d2e1f] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-[#6b5d4f] text-sm">Keep chatting to build your knowledge.</p>
              <p className="text-[#6b5d4f]/60 text-xs mt-1">Understood concepts will appear here.</p>
            </div>
          )}
        </div>

        {/* Concepts Confused */}
        <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <svg className="w-4 h-4 text-rose-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-[#e8dcc8] text-sm font-semibold">Concepts Confused</h2>
            <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 tabular-nums">
              {conceptMap.conceptsConfused.length}
            </span>
          </div>

          {conceptMap.conceptsConfused.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {conceptMap.conceptsConfused.map((concept, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/8 text-rose-300 text-xs font-medium border border-rose-500/20 hover:bg-rose-500/15 transition-colors"
                >
                  <svg className="w-3 h-3 text-rose-400/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  {concept}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-10 h-10 text-[#3d2e1f] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[#6b5d4f] text-sm">No confusion detected yet.</p>
              <p className="text-[#6b5d4f]/60 text-xs mt-1">Areas of confusion will be tracked as you learn.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
