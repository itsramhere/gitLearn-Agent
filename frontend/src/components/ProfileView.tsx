import React from 'react';
import type { StudentProfile } from '../types';

interface ProfileViewProps {
  profile: StudentProfile;
  onBack: () => void;
}

const getSkillInfo = (level: number | string): { label: string; filled: number; color: string; dotColor: string } => {
  const normalized = typeof level === 'string' ? level.toLowerCase().trim() : level;

  if (normalized === 'advanced' || (typeof normalized === 'number' && normalized >= 4)) {
    return { label: 'Advanced', filled: 5, color: 'text-emerald-400', dotColor: 'bg-emerald-400' };
  }
  if (normalized === 'intermediate' || (typeof normalized === 'number' && normalized === 3)) {
    return { label: 'Intermediate', filled: 3, color: 'text-amber-400', dotColor: 'bg-amber-400' };
  }
  if (typeof normalized === 'number' && normalized === 2) {
    return { label: 'Elementary', filled: 2, color: 'text-orange-400', dotColor: 'bg-orange-400' };
  }
  return { label: 'Beginner', filled: 1, color: 'text-rose-400', dotColor: 'bg-rose-400' };
};

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onBack }) => {
  const skill = getSkillInfo(profile.inferredSkillLevel);
  const goals = Array.isArray(profile.goals) ? profile.goals : [profile.goals];
  const technologies = Object.keys(profile.familiarity);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[#e8dcc8] text-xl font-semibold tracking-tight">Your Profile</h1>
            <p className="text-[#6b5d4f] text-xs mt-0.5">Your learning profile at a glance</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8">
        <div className="max-w-lg mx-auto space-y-5 pt-2">
          {/* Domain & Experience Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Domain */}
            <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-[#9a8b78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider">Domain</span>
              </div>
              <p className="text-[#e8dcc8] text-base font-medium">{profile.domain || 'General'}</p>
            </div>

            {/* Experience */}
            <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-[#9a8b78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider">Experience</span>
              </div>
              <p className="text-[#e8dcc8] text-base font-medium">
                {profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? 'year' : 'years'}
              </p>
            </div>
          </div>

          {/* Skill Level */}
          <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-[#9a8b78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider">Skill Level</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-base font-semibold ${skill.color}`}>{skill.label}</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <div
                    key={dot}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      dot <= skill.filled ? skill.dotColor : 'bg-[#3d2e1f]'
                    }`}
                  />
                ))}
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 w-full h-1.5 rounded-full bg-[#3d2e1f] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${skill.dotColor}`}
                style={{ width: `${(skill.filled / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Technologies */}
          <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-[#9a8b78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider">Technologies</span>
              <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#332818] text-[#9a8b78] border border-[#3d2e1f] tabular-nums">
                {technologies.length}
              </span>
            </div>

            {technologies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => {
                  const level = profile.familiarity[tech];
                  return (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#332818] text-[#e8dcc8] text-xs font-medium border border-[#3d2e1f] hover:border-[#d4a574]/30 transition-colors"
                    >
                      {tech}
                      {level && (
                        <span className="text-[10px] text-[#6b5d4f] ml-0.5">· {level}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#6b5d4f] text-sm italic">No technologies listed.</p>
            )}
          </div>

          {/* Goals */}
          <div className="bg-[#2a2018] rounded-xl border border-[#3d2e1f] p-5">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-[#9a8b78]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="text-[10px] font-semibold text-[#6b5d4f] uppercase tracking-wider">Goals</span>
            </div>

            {goals.length > 0 && goals[0] ? (
              <ul className="space-y-2.5">
                {goals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md bg-[#d4a574]/10 border border-[#d4a574]/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#d4a574]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#e8dcc8] text-sm leading-relaxed">{goal}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#6b5d4f] text-sm italic">No goals defined yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
