import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import { GitlabMCP } from '../src/mcps/GitlabMCP';
import { CodeExplainerAgent } from '../src/agents/CodeExplainerAgent';

config();

async function run() {
  console.log("Booting up Fastify to connect to MongoDB...");
  const fastify = Fastify({ logger: false });

  try {
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.ready();

    const usersCollection = fastify.mongo.db.collection('users');
    let user = await usersCollection.findOne({});
    
    if (!user) {
      console.log("No user found in DB, creating a temporary one for this test...");
      const res = await usersCollection.insertOne({
        profile: {
          domain: 'Backend',
          yearsOfExperience: 2,
          familiarity: { go: 'intermediate' },
          goals: 'Fix bugs',
          inferredSkillLevel: 'intermediate'
        },
        conceptMap: { filesExplained: [], conceptsUnderstood: [], conceptsConfused: [] },
        sessionHistory: [],
        claimedIssues: [],
        solvedIssues: []
      });
      user = await usersCollection.findOne({ _id: res.insertedId });
    }

    console.log(`Using User ID: ${user!._id.toString()}`);

    const gitlabMcp = new GitlabMCP();
    const explainer = new CodeExplainerAgent(fastify, gitlabMcp);

    const question = "How does the update checker work in this repo?";
    console.log(`\nAsking: "${question}"`);
    console.log(`Repository: https://gitlab.com/gitlab-org/cli\n`);
    
    console.log("Waiting for Gemini and GitLab MCP to analyze...");
    const result = await explainer.explainCode(
      user!._id.toString(),
      user!.profile,
      "https://gitlab.com/gitlab-org/cli",
      question
    );

    console.log("\n================ EXPLANATION ================\n");
    console.log(result.explanation);
    console.log("\n=============================================\n");
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await fastify.close();
  }
}

run().catch(console.error);
