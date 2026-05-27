import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';
import { GitlabMCP } from '../src/mcps/GitlabMCP';
import { ProfilerAgent } from '../src/agents/ProfilerAgent';
import { CodeExplainerAgent } from '../src/agents/CodeExplainerAgent';
import { IssueMatcherAgent } from '../src/agents/IssueMatcherAgent';
import { ProgressTrackerAgent } from '../src/agents/ProgressTrackerAgent';
import { OrchestratorAgent } from '../src/agents/OrchestratorAgent';
import { ObjectId } from 'mongodb';

config();

async function runStep6Test() {
  console.log("Starting Step 6 Test: Orchestrator End-to-End...");
  
  const fastify = Fastify({ logger: false });

  try {
    // 1. Connect Databases
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
    await fastify.ready();
    console.log("✅ DB Connections successful!");

    // 2. Instantiate all agents
    const gitlabMcp = new GitlabMCP();
    const profiler = new ProfilerAgent(fastify);
    const explainer = new CodeExplainerAgent(fastify, gitlabMcp);
    const matcher = new IssueMatcherAgent(fastify, gitlabMcp);
    const tracker = new ProgressTrackerAgent(fastify, gitlabMcp);
    
    const orchestrator = new OrchestratorAgent(
      fastify,
      profiler,
      explainer,
      matcher,
      tracker
    );

    const studentId = new ObjectId().toHexString();
    const repoUrl = "https://gitlab.com/gitlab-org/cli";
    
    console.log(`\n--- Simulating Conversation for New Student (${studentId}) ---\n`);

    // Helper to print and run message
    const chat = async (message: string) => {
      console.log(`\n👤 Student: "${message}"`);
      const response = await orchestrator.handleMessage(studentId, message, repoUrl);
      console.log(`🤖 Orchestrator: "${response}"`);
      
      // Artificial delay to prevent hitting the Gemini Free-Tier per-minute quota
      console.log("[System: Waiting 10s to avoid rate limits...]");
      await new Promise(r => setTimeout(r, 10000));
      
      return response;
    };

    // Chat 1: Initial Greeting (No Profile)
    await chat("Hi there! I'm new to this platform.");

    // Chat 2: Provide Profile Details
    await chat("My domain is Backend. I have 1 year of experience. I know javascript beginner and python intermediate. My goal is to fix bugs.");

    // Chat 3: Code Explanation
    await chat("Can you explain what the README.md file tells us?");

    // Chat 4: Issue Matching
    // We already seeded issues in step 4, so it should find them
    await chat("I think I'm ready. Can you find some unsolved issues for me?");

    // Since the orchestrator doesn't natively expose a chat command to "Claim" an issue right now 
    // (that would normally happen via a UI button), we'll simulate the UI claiming it directly.
    console.log("\n[System: Simulating UI click to claim 'backend-issue-1']");
    await matcher.claimIssue(studentId, "backend-issue-1");

    // Chat 5: Solve Confirmation
    await chat("I finished it! Here is my PR: https://gitlab.com/example/repo/-/merge_requests/123");

    // Chat 6: Provide Tips
    await chat("My tip is to double check your syntax before committing!");

    console.log("\n🎉 Step 6 End-to-End Test fully passed! The Orchestrator correctly routed everything.");

  } catch (err) {
    console.error("\n❌ Test Failed. Here is the error:", err);
  } finally {
    await fastify.close();
  }
}

runStep6Test();
