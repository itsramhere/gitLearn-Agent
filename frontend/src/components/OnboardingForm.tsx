import React, { useState } from 'react';
import { updateStudentProfile } from '../services/api';

interface OnboardingFormProps {
  studentId: string;
  accessToken: string;
  onComplete: () => void;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({ studentId, accessToken, onComplete }) => {
  const [domain, setDomain] = useState('Frontend Developer');
  const [yearsOfExperience, setYearsOfExperience] = useState(1);
  const [familiarityText, setFamiliarityText] = useState('');
  const [goals, setGoals] = useState('');
  const [skillLevel, setSkillLevel] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Parse the familiarity comma-separated string into an object
    const familiarityObj: Record<string, string> = {};
    const techs = familiarityText.split(',').map(t => t.trim()).filter(Boolean);
    techs.forEach(tech => {
      familiarityObj[tech.toLowerCase()] = 'intermediate'; // default fallback level
    });

    const profileData = {
      domain,
      yearsOfExperience: Number(yearsOfExperience),
      familiarity: familiarityObj,
      goals,
      inferredSkillLevel: skillLevel
    };

    try {
      await updateStudentProfile(studentId, accessToken, profileData);
      onComplete(); // trigger refresh in dashboard
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'An error occurred while saving your profile.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center relative overflow-hidden font-sans p-6">
      {/* Ambient background glow effects */}
      <div className="absolute top-0 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl bg-slate-900/60 backdrop-blur-2xl border border-slate-800/60 rounded-3xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome to GitLearn!</h2>
          <p className="text-slate-400 text-sm">Tell us a bit about yourself so we can personalize your learning journey.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Primary Domain</label>
              <select 
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              >
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Fullstack Developer">Fullstack Developer</option>
                <option value="Mobile Developer">Mobile Developer</option>
                <option value="Data Scientist">Data Scientist</option>
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Years of Experience</label>
              <input 
                type="number" 
                min="0"
                max="50"
                value={yearsOfExperience}
                onChange={e => setYearsOfExperience(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Familiarity */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Technologies you know</label>
            <input 
              type="text" 
              value={familiarityText}
              onChange={e => setFamiliarityText(e.target.value)}
              placeholder="e.g. React, Node.js, Python, MongoDB"
              className="w-full bg-slate-950 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <p className="text-slate-500 text-xs mt-2">Comma separated list of languages or frameworks.</p>
          </div>

          {/* Goals */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Learning Goals</label>
            <textarea 
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="What do you want to learn? e.g. I want to learn how to structure large React applications."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700/50 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              required
            />
          </div>

          {/* Skill Level */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Self-Assessed Skill Level (1-5)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value)}
                className="flex-1 accent-indigo-500"
              />
              <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                {skillLevel}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs mt-2">
              <span>Beginner</span>
              <span>Expert</span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_30px_rgba(79,70,229,0.45)]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Complete Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
