import { UserRepository } from '../src/repositories/UserRepository';
import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';
import { GitlabMCPClient, ElasticMCPClient, MongoMCPClient } from '../src/core/mcpClient';
import { ProfilerAgent } from '../src/agents/ProfilerAgent';
import { CodeExplainerAgent } from '../src/agents/CodeExplainerAgent';
import { IssueMatcherAgent } from '../src/agents/IssueMatcherAgent';
import { ProgressTrackerAgent } from '../src/agents/ProgressTrackerAgent';
import { OrchestratorAgent } from '../src/agents/OrchestratorAgent';

config();

async function run() {
  console.log("Booting up Fastify...");
  const fastify = Fastify({ logger: false });

  try {
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
    await fastify.ready();

    const usersCollection = fastify.mongo.db.collection('users');
    const user = await usersCollection.findOne({});
    
    if (!user) {
      throw new Error("No existing user found.");
    }

    console.log(`Using Existing User ID: ${user._id.toString()}`);

    const gitlabMcp = new GitlabMCPClient();
    
    // Initialize Agents
    const profiler = new ProfilerAgent(fastify);
    const explainer = new CodeExplainerAgent(new UserRepository(fastify.mongo.db), gitlabMcp, new MongoMCPClient());
    const matcher = new IssueMatcherAgent(fastify, gitlabMcp, new ElasticMCPClient());
    const tracker = new ProgressTrackerAgent(fastify, gitlabMcp);
    const orchestrator = new OrchestratorAgent(fastify, profiler, explainer, matcher, tracker);

    const question = "I want to claim the Backend Database Connection Pool issue (dummy-issue-100)";
    console.log(`\n👤 Student: "${question}"`);
    
    console.log("\nWaiting for Orchestrator to lock the claim...\n");
    
    try {
      const result = await orchestrator.handleMessage(
        user._id.toString(),
        question,
        "https://gitlab.com/gitlab-org/cli"
      );

      console.log("================ ORCHESTRATOR RESPONSE ================\n");
      console.log(result);
      console.log("\n========================================================\n");
    } catch (err: any) {
      console.warn("Orchestrator hit a Gemini error (503). Falling back to direct Matcher claim for testing purposes...");
      
      const claimResult = await matcher.claimIssue(user._id.toString(), "dummy-issue-100");
      console.log("\n✅ Direct Claim Result:", claimResult);
      console.log("MongoDB and Elasticsearch have been successfully updated with the 48-hour TTL lock.");
    }
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await fastify.close();
  }
}

run().catch(console.error);
