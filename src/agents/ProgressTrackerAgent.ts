import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { GitlabMCP } from '../mcps/GitlabMCP';

export class ProgressTrackerAgent {
  private fastify: FastifyInstance;
  private gitlabMcp: GitlabMCP;

  constructor(fastify: FastifyInstance, gitlabMcp: GitlabMCP) {
    this.fastify = fastify;
    this.gitlabMcp = gitlabMcp;
  }

  // ============================================================================
  // 1. Solve Confirmation Flow
  // ============================================================================

  /**
   * Step 1 of Solve Confirmation: Verify PR exists and ask for tips.
   * Returns the message the Orchestrator should send to the student.
   */
  public async verifySolveAndAskForTips(gitlabIssueId: string, prUrl: string) {
    // Verify the PR actually exists via GitLab MCP
    const prExists = await this.gitlabMcp.verifyPullRequest(prUrl);
    if (!prExists) {
      return "I couldn't find a pull request at that URL. Could you double-check the link and send it again?";
    }

    return "Awesome job! I've verified your pull request. Before we close this out, do you have any tips or gotchas you learned that might help the next student who tackles a similar issue?";
  }

  /**
   * Step 2 of Solve Confirmation: Process the tips and update DBs.
   * Called by Orchestrator after the student replies with their tips.
   */
  public async processSolveTips(studentId: string, gitlabIssueId: string, tips: string) {
    const timestamp = new Date();

    // A. Update MongoDB
    const issuesCollection = this.fastify.mongo.db.collection('issues');
    await issuesCollection.updateOne(
      { gitlabIssueId },
      { 
        $set: { status: 'solved' },
        $unset: { expiresAt: "" }
      }
    );

    const solutionsCollection = this.fastify.mongo.db.collection('solutions');
    await solutionsCollection.insertOne({
      solverId: new ObjectId(studentId),
      issueId: gitlabIssueId,
      tips,
      timestamp
    });

    // B. Update Elastic
    await this.fastify.elastic.update({
      index: 'issues',
      id: gitlabIssueId,
      doc: { status: 'solved' }
    });

    await this.fastify.elastic.index({
      index: 'solver_notes',
      document: {
        issueId: gitlabIssueId,
        solverId: studentId,
        tips,
        timestamp
      }
    });

    return "Thanks for sharing! Your tips have been saved to help future students. Are you ready for your next issue?";
  }

  // ============================================================================
  // 2. TTL Nudge Flow
  // ============================================================================

  /**
   * Composes a nudge message when the TTL is within 6 hours of expiry.
   */
  public generateTtlNudgeMessage(gitlabIssueId: string): string {
    return `Hi there! I noticed your claim on issue #${gitlabIssueId} expires in less than 6 hours. Do you need any help with it, would you like an extension, or should we release it back to the pool for someone else?`;
  }

  /**
   * Called by the Orchestrator when the TTL has fully expired and the student didn't respond.
   */
  public async processExpiredClaim(studentId: string, gitlabIssueId: string): Promise<string> {
    // A. Update MongoDB back to unsolved and clear solver
    const issuesCollection = this.fastify.mongo.db.collection('issues');
    await issuesCollection.updateOne(
      { gitlabIssueId },
      { 
        $set: { status: 'unsolved' },
        $unset: { solverId: "", expiresAt: "" } 
      }
    );

    // B. Remove from student's claimedIssues array
    const usersCollection = this.fastify.mongo.db.collection('users');
    await usersCollection.updateOne(
      { _id: new ObjectId(studentId) },
      { $pull: { claimedIssues: gitlabIssueId } as any }
    );

    // C. Update Elastic back to unsolved
    await this.fastify.elastic.update({
      index: 'issues',
      id: gitlabIssueId,
      doc: { status: 'unsolved' }
    });

    // Compose message to the student
    return `Your claim on issue #${gitlabIssueId} has expired and been released back to the pool. Do you want a new issue recommendation?`;
  }

  // ============================================================================
  // 3. Stuck Detection Flow
  // ============================================================================

  /**
   * Evaluates if a student is stuck and recommends an action to the Orchestrator.
   */
  public evaluateStuckState(questionCount: number): { action: 'NONE' | 'INVOKE_CODE_EXPLAINER' | 'SUGGEST_SIMPLER_ISSUE', reason: string } {
    if (questionCount > 3) {
      // Recommendation returned to Orchestrator
      return {
        action: 'INVOKE_CODE_EXPLAINER',
        reason: 'Student has asked more than 3 questions about this area. Recommend invoking the Code Explainer Agent for a deep dive, or suggesting a simpler issue if they remain blocked.'
      };
    }

    return { action: 'NONE', reason: 'Question count is within normal bounds.' };
  }
}
