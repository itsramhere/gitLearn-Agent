import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';

import { generateWithGemini } from '../core/geminiClient';
import { GitlabMCPClient, ElasticMCPClient } from '../core/mcpClient';


export class IssueMatcherAgent {
  private fastify: FastifyInstance;
  private gitlabMcp: GitlabMCPClient;
  private elasticMcp: ElasticMCPClient;
  private elasticMcpConnected: boolean = false;

  constructor(fastify: FastifyInstance, gitlabMcp: GitlabMCPClient, elasticMcp: ElasticMCPClient) {
    this.fastify = fastify;
    this.gitlabMcp = gitlabMcp;
    this.elasticMcp = elasticMcp;
  }

  /**
   * Ensures the Elastic MCP connection is established exactly once.
   */
  private async ensureElasticMcpConnected(): Promise<void> {
    if (!this.elasticMcpConnected) {
      try {
        await this.elasticMcp.connect();
        this.elasticMcpConnected = true;
      } catch (err: any) {
        console.error('[IssueMatcherAgent] Failed to connect to Elastic MCP Server:', err);
        throw new Error('Internal Error: Could not connect to Elastic MCP Server.');
      }
    }
  }

  /**
   * Finds, scores, and verifies the top 3 issues for a student.
   *
   * @param studentId The student's MongoDB ObjectId string
   * @param profile The student's profile
   * @param conceptMap The student's current concept map
   */
  public async matchAndRecommendIssues(
    studentId: string,
    profile: any,
    conceptMap: any
  ) {
    // Step 0: Ensure Elastic MCP is connected
    await this.ensureElasticMcpConnected();

    // 1. Query Elastic MCP for unsolved issues matching the student's tech stack
    const techStackQuery = Object.keys(profile.familiarity || {}).join(' ');

    const candidateIssues = await this.elasticMcp.searchIssues(techStackQuery, profile.domain || '');

    console.log(`[IssueMatcherAgent] Fetched ${candidateIssues.length} candidates from Elastic MCP`);

    if (candidateIssues.length === 0) {
      return [];
    }

    // 2. Query MongoDB for the latest concept map before scoring
    const usersCollection = this.fastify.mongo.db.collection('users');
    const userDoc = await usersCollection.findOne({ _id: new ObjectId(studentId) });
    const latestConceptMap = userDoc?.conceptMap || { filesExplained: [], conceptsUnderstood: [], conceptsConfused: [] };

    // 3. Score each candidate on the 3 dimensions using Gemini
    const scoringPrompt = `
      You are the Issue Matcher Agent.
      Student Profile: ${JSON.stringify(profile)}
      Student Concept Map: ${JSON.stringify(latestConceptMap)}
      
      Candidate Issues:
      ${JSON.stringify(candidateIssues)}
      
      Score each issue out of 10 on three dimensions:
      1. Skill Match: Can the student realistically do this?
      2. Learning Potential: Will it stretch them appropriately?
      3. Concept Overlap: If the issue relates to a module or file already in the student's concept map and marked as understood, that issue should score higher. If the issue relates to a module the student has not yet studied at all, it should score lower.
      
      Rank the issues by their total score.
      Output a JSON array of ALL the candidate issues, ranked by their total score. You MUST return every candidate issue in your response.
      Each object must have:
      - "id": the issue ID
      - "iid": the issue IID
      - "projectPath": the project path
      - "totalScore": number
      - "reasoning": A plain-language explanation of why this was chosen, directly addressing the student. The reasoning MUST explicitly mention concept overlap. For example: 'This issue involves the authentication module you have already studied.'
    `;

    const scoredIssuesText = await generateWithGemini(scoringPrompt);
    const match = scoredIssuesText.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : scoredIssuesText.replace(/```json|```/g, '');
    let rankedIssues = [];
    try {
      rankedIssues = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[IssueMatcherAgent] JSON Parse Error:', e, 'Raw string:', jsonStr);
    }

    console.log(`[IssueMatcherAgent] Gemini returned ${rankedIssues.length} ranked issues.`);

    // 4. Fetch live details of the top issues from GitLab MCP to verify they are open
    const topThreeVerified = [];

    for (const issue of rankedIssues) {
      if (topThreeVerified.length >= 3) break;

      const projectPath = issue.projectPath || 'gitlab-org/cli';
      const issueIid = issue.iid;

      if (!issueIid) {
        console.warn(`[IssueMatcherAgent] Skipping issue ${issue.id}: missing iid`);
        continue;
      }

      try {
        console.log(`[IssueMatcherAgent] Verifying live issue iid=${issueIid} in project=${projectPath}`);

        const liveIssue = await this.gitlabMcp.getIssueDetails(projectPath, issueIid);

        if (liveIssue.state === 'opened' && !liveIssue.assignee) {
          topThreeVerified.push({
            id: issue.id,
            iid: liveIssue.iid,
            title: liveIssue.title,
            reasoning: issue.reasoning,
            web_url: liveIssue.web_url,
            description: liveIssue.description,
            labels: liveIssue.labels
          });
        }
      } catch (err: any) {
        console.error(`[IssueMatcherAgent] Failed to fetch live issue iid=${issueIid} in project=${projectPath}. Error: ${err.message}`);
        continue;
      }
    }

    return topThreeVerified;
  }

  /**
   * Called when a student selects one of the recommended issues.
   * Locks the issue with a 48-hour TTL.
   *
   * @param studentId The student's MongoDB ObjectId string
   * @param gitlabIssueId The selected issue ID
   */
  public async claimIssue(studentId: string, gitlabIssueId: string) {
    const issuesCollection = this.fastify.mongo.db.collection('issues');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // 1. Write to MongoDB (status, solverId, TTL lock, claimedAt)
    await issuesCollection.updateOne(
      { gitlabIssueId },
      {
        $set: {
          status: 'claimed',
          solverId: new ObjectId(studentId),
          expiresAt: expiresAt,
          claimedAt: now
        }
      },
      { upsert: true }
    );

    // Add to student's claimed issues
    const usersCollection = this.fastify.mongo.db.collection('users');
    await usersCollection.updateOne(
      { _id: new ObjectId(studentId) },
      { $addToSet: { claimedIssues: gitlabIssueId } as any }
    );

    // 2. Update issue status in Elastic (direct call -- standard CRUD, not agentic)
    await this.fastify.elastic.update({
      index: 'issues',
      id: gitlabIssueId,
      doc: {
        status: 'claimed'
      }
    });

    return {
      gitlabIssueId,
      status: 'claimed',
      expiresAt
    };
  }
}
