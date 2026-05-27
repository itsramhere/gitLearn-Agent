export interface StudentProfile {
  domain: string;
  yearsOfExperience: number;
  familiarity: Record<string, string>;
  goals: string | string[];
  inferredSkillLevel: string | number;
}

export interface ConceptMap {
  filesExplained: string[];
  conceptsUnderstood: string[];
  conceptsConfused: string[];
}

export interface ClaimedIssue {
  gitlabIssueId: string;
  status: string;
  expiresAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}
