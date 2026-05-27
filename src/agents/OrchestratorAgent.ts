import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';

import { ProfilerAgent } from './ProfilerAgent';
import { CodeExplainerAgent } from './CodeExplainerAgent';
import { IssueMatcherAgent } from './IssueMatcherAgent';
import { ProgressTrackerAgent } from './ProgressTrackerAgent';

// Placeholder for Gemini integration
import { generateWithGemini } from '../core/geminiClient';

export class OrchestratorAgent {
  private fastify: FastifyInstance;
  private profiler: ProfilerAgent;
  private explainer: CodeExplainerAgent;
  private matcher: IssueMatcherAgent;
  private tracker: ProgressTrackerAgent;

  constructor(
    fastify: FastifyInstance,
    profiler: ProfilerAgent,
    explainer: CodeExplainerAgent,
    matcher: IssueMatcherAgent,
    tracker: ProgressTrackerAgent
  ) {
    this.fastify = fastify;
    this.profiler = profiler;
    this.explainer = explainer;
    this.matcher = matcher;
    this.tracker = tracker;
  }

  /**
   * Main entry point for student interaction.
   */
  public async handleMessage(studentId: string, message: string, repoUrl: string = "https://gitlab.com/example/repo"): Promise<string> {
    const usersCollection = this.fastify.mongo.db.collection('users');
    const issuesCollection = this.fastify.mongo.db.collection('issues');

    const userDoc = await usersCollection.findOne({ _id: new ObjectId(studentId) });

    // ============================================================================
    // 1. Check TTL State (Mandatory before routing)
    // ============================================================================
    // Look for any issue currently claimed by this student
    const claimedIssue = await issuesCollection.findOne({ 
      solverId: new ObjectId(studentId),
      status: 'claimed'
    });

    let prefixMessage = "";

    if (claimedIssue && claimedIssue.expiresAt) {
      const now = new Date();
      const expiresAt = new Date(claimedIssue.expiresAt);
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiry <= 0) {
        // TTL fully expired. Delegate the release flow to the Tracker Agent
        return await this.tracker.processExpiredClaim(studentId, claimedIssue.gitlabIssueId);
      } else if (hoursUntilExpiry <= 6) {
        // Approaching expiry warning prepended to the final answer
        prefixMessage = `⚠️ Warning: Your claim on issue #${claimedIssue.gitlabIssueId} will expire in less than 6 hours!\n\n`;
      }
    }

    // ============================================================================
    // 2. Profile Routing
    // ============================================================================
    if (!userDoc || !userDoc.profile) {
      if (message.length < 20 && !message.toLowerCase().includes('domain')) {
        const questions = this.profiler.getInterviewQuestions();
        return `Welcome to GitLearn Agent! Before we dive into the code, I need to know a bit about you:\n\n- ${questions.join('\n- ')}`;
      } else {
        // Parse the answers into JSON using Gemini
        const parsePrompt = `
          Extract the following details from the student's message into JSON.
          Message: "${message}"
          
          Required JSON keys:
          - "domain" (string)
          - "yearsOfExperience" (number)
          - "familiarity" (object mapping language/framework to skill level like "beginner", "expert")
          - "goals" (string)
          
          Output ONLY valid JSON.
        `;
        const jsonStr = await generateWithGemini(parsePrompt);
        const parsed = JSON.parse(jsonStr.replace(/```json|```/g, ''));
        
        if (!parsed.domain || parsed.yearsOfExperience === undefined) {
          const questions = this.profiler.getInterviewQuestions();
          return `Welcome to GitLearn Agent! Before we dive into the code, I need to know a bit about you:\n\n- ${questions.join('\n- ')}`;
        }
        
        await this.profiler.processInterviewAndSave(studentId, parsed);
        return "Awesome! Your profile has been saved. You can now ask me to explain the codebase or find an issue to work on!";
      }
    }

    // ============================================================================
    // 3. Intent Routing using Gemini
    // ============================================================================
    const routingPrompt = `
      You are the Orchestrator Router.
      Student Message: "${message}"
      
      Determine the intent. Respond ONLY with one of these strict string codes:
      - EXPLAIN_CODE (Student is asking about how the codebase works)
      - MATCH_ISSUES (Student is asking for an issue to work on)
      - SOLVE_CONFIRM (Student says they finished the issue or has a PR)
      - PROVIDE_TIPS (Student is providing tips/advice after a solve)
      - UNKNOWN (General chatter)
    `;
    
    const intentRaw = await generateWithGemini(routingPrompt);
    const intent = intentRaw.trim();

    // Stuck Detection Logic
    // If they ask for explanations multiple times, we run evaluateStuckState
    if (intent === 'EXPLAIN_CODE' && claimedIssue) {
      let realQuestionCount = 0;
      if (claimedIssue.claimedAt && userDoc.sessionHistory) {
        realQuestionCount = userDoc.sessionHistory.filter(
          (session: any) => new Date(session.timestamp) >= new Date(claimedIssue.claimedAt)
        ).length;
      }
      
      const stuckCheck = this.tracker.evaluateStuckState(realQuestionCount);
      
      if (stuckCheck.action === 'SUGGEST_SIMPLER_ISSUE') {
        return prefixMessage + `I notice you've been stuck on this module for a while. Would you like me to find a slightly simpler issue to start with instead?`;
      }
    }

    switch (intent) {
      case 'EXPLAIN_CODE':
        const explanationResult = await this.explainer.explainCode(
          studentId, 
          userDoc.profile, 
          repoUrl, 
          message
        );
        return prefixMessage + explanationResult.explanation;

      case 'MATCH_ISSUES':
        const candidateIssues = await this.matcher.matchAndRecommendIssues(
          studentId, 
          userDoc.profile, 
          userDoc.conceptMap
        );
        
        if (candidateIssues.length === 0) {
          return prefixMessage + "I couldn't find any unsolved issues that match your profile right now.";
        }
        
        let responseStr = "Here are the top issues I found for you:\n\n";
        candidateIssues.forEach((issue: any) => {
          responseStr += `**Issue #${issue.id}: ${issue.title}**\n*Reasoning:* ${issue.reasoning}\n\n`;
        });
        responseStr += "Use the **Find Issues** button to browse and claim issues directly!";
        return prefixMessage + responseStr;

      case 'SOLVE_CONFIRM':
        // Assuming the student pastes a PR link in the message
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = message.match(urlRegex) || [];
        const prUrl = urls[0] || ""; // Grab first URL
        
        if (claimedIssue) {
          return prefixMessage + await this.tracker.verifySolveAndAskForTips(claimedIssue.gitlabIssueId, prUrl);
        } else {
          return prefixMessage + "You don't seem to have an active claim right now. Are you sure you linked the right PR?";
        }

      case 'PROVIDE_TIPS':
        if (claimedIssue) {
          return prefixMessage + await this.tracker.processSolveTips(studentId, claimedIssue.gitlabIssueId, message);
        } else {
          return prefixMessage + "Thanks for the tips! (However, I couldn't find the issue you were working on.)";
        }

      default:
        return prefixMessage + "I'm the Orchestrator. You can ask me to explain the codebase, find issues for you, or verify a pull request when you're done!";
    }
  }
}
