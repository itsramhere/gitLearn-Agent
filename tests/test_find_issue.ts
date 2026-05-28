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
      throw new Error("No existing user found. Please run the previous tests to create a user.");
    }

    console.log(`Using Existing User ID: ${user._id.toString()}`);
    console.log(`User Profile: ${JSON.stringify(user.profile, null, 2)}`);

    const gitlabMcp = new GitlabMCPClient();
    
    // Initialize Agents
    const profiler = new ProfilerAgent(fastify);
    const explainer = new CodeExplainerAgent(new UserRepository(fastify.mongo.db), gitlabMcp, new MongoMCPClient());
    const matcher = new IssueMatcherAgent(fastify, gitlabMcp, new ElasticMCPClient());
    const tracker = new ProgressTrackerAgent(fastify, gitlabMcp);
    const orchestrator = new OrchestratorAgent(fastify, profiler, explainer, matcher, tracker);

    const question = "Find me an issue I can work on";
    console.log(`\n👤 Student: "${question}"`);
    
    console.log("\nWaiting for Orchestrator to route and Matcher to recommend...\n");
    const result = await orchestrator.handleMessage(
      user._id.toString(),
      question,
      "https://gitlab.com/gitlab-org/cli"
    );

    console.log("================ ORCHESTRATOR RESPONSE ================\n");
    console.log(result);
    console.log("\n========================================================\n");
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await fastify.close();
  }
}

run().catch(console.error);
