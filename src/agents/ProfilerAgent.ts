import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';

// Assuming geminiClient exposes a method to call the Gemini model
import { inferSkillLevelWithGemini } from '../core/geminiClient';

export class ProfilerAgent {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Starts the profiling interview.
   * You mentioned "these specific questions" but didn't list them, 
   * so I have aligned these with Section 4.2 of the architecture document.
   */
  public getInterviewQuestions(): string[] {
    return [
      "What is your primary software domain? (e.g., Frontend, Backend, Data Science)",
      "How many years of programming experience do you have?",
      "Which languages and frameworks are you most familiar with?",
      "What are your specific learning goals for contributing to open source?"
    ];
  }

  /**
   * Processes the student's answers, uses Gemini to infer the true skill level,
   * and saves the resulting profile to both MongoDB and Elastic.
   */
  public async processInterviewAndSave(
    studentId: string,
    answers: { domain: string; yearsOfExperience: number; familiarity: Record<string, string>; goals: string }
  ) {
    // 1. Infer skill level using Gemini
    // Architecture Doc 4.2: "infers skill level beyond self-reporting — a developer with five years 
    // of experience who has never used Django is treated as backend-intermediate but Django-beginner"
    const inferredSkill = await inferSkillLevelWithGemini(
      `Based on these answers, infer the student's true skill level. 
       Domain: ${answers.domain}
       YoE: ${answers.yearsOfExperience}
       Familiarity: ${JSON.stringify(answers.familiarity)}
       Goals: ${answers.goals}`
    );

    const profileDoc = {
      domain: answers.domain,
      yearsOfExperience: answers.yearsOfExperience,
      familiarity: answers.familiarity,
      goals: answers.goals,
      inferredSkillLevel: inferredSkill
    };

    // 2. Write to MongoDB (Record of Truth)
    const usersCollection = this.fastify.mongo.db.collection('users');
    await usersCollection.updateOne(
      { _id: new ObjectId(studentId) },
      {
        $set: { profile: profileDoc },
        $setOnInsert: {
          sessionHistory: [],
          conceptMap: {},
          claimedIssues: [],
          solvedIssues: []
        }
      },
      { upsert: true }
    );

    // 3. Write to Elastic (Search & Matching Layer)
    // Architecture Doc 5.2: "User profile index: domain, tech stack, YoE, proficiency (for similarity search)"
    await this.fastify.elastic.index({
      index: 'user_profiles',
      id: studentId,
      body: {
        domain: profileDoc.domain,
        techStack: Object.keys(profileDoc.familiarity).join(', '), // Flattening for keyword search
        yearsOfExperience: profileDoc.yearsOfExperience,
        proficiency: profileDoc.inferredSkillLevel,
        profileText: `${profileDoc.domain} developer with ${profileDoc.yearsOfExperience} years of experience. Familiar with ${Object.keys(profileDoc.familiarity).join(', ')}. Goals: ${profileDoc.goals}`
      }
    });

    return profileDoc;
  }
}
