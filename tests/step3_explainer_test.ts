import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import { GitlabMCPClient, ElasticMCPClient, MongoMCPClient } from '../src/core/mcpClient';
import { CodeExplainerAgent } from '../src/agents/CodeExplainerAgent';
import { UserRepository } from '../src/repositories/UserRepository';
import { ObjectId } from 'mongodb';

config();

async function runStep3Test() {
  console.log("Starting Step 3 Test: Code Explainer Agent...");
  
  const fastify = Fastify({ logger: false });

  try {
    // 1. Connect MongoDB
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.ready();
    console.log("✅ DB Connection successful!");

    // 2. Initialize MCP, Repository, and Agent
    const gitlabMcp = new GitlabMCPClient();
    const userRepository = new UserRepository(fastify.mongo.db);
    const explainer = new CodeExplainerAgent(userRepository, gitlabMcp, new MongoMCPClient());
    
    const usersCollection = fastify.mongo.db.collection('users');
    const studentId = new ObjectId();

    // 3. Create a dummy student in Mongo (Pre-requisite)
    console.log("\nCreating a dummy beginner student in MongoDB...");
    const dummyProfile = {
      domain: "Backend",
      yearsOfExperience: 1,
      familiarity: {},
      goals: "Learn the codebase",
      inferredSkillLevel: "Beginner" // Should trigger analogy/line-by-line explanation
    };

    await usersCollection.insertOne({
      _id: studentId,
      profile: dummyProfile,
      sessionHistory: [],
      conceptMap: { "Basic Git": "Understands commits" }, // Pre-existing knowledge
      claimedIssues: [],
      solvedIssues: []
    });

    // 4. Run the Code Explainer
    // We will use a highly predictable public repo and question so Gemini guesses the file correctly
    const repoUrl = "https://gitlab.com/gitlab-org/cli";
    const question = "Can you explain what the Makefile does in this CLI app?";

    console.log(`\nAsking Code Explainer: "${question}"`);
    console.log("This will trigger Gemini to guess the file path, fetch it via GitLab MCP, and explain it adaptively...");
    
    const result = await explainer.explainCode(
      studentId.toHexString(),
      dummyProfile,
      repoUrl,
      question
    );

    console.log(`\n🤖 Code Explainer Answer:\n${result.explanation}\n`);

    // 5. Verify MongoDB updates
    console.log("Verifying MongoDB updates (Session Log and Concept Map)...");
    const updatedUser = await usersCollection.findOne({ _id: studentId });

    if (updatedUser && updatedUser.sessionHistory.length > 0) {
      console.log(`✅ Session log successfully written. Files fetched: ${updatedUser.sessionHistory[0].filesFetched.join(', ')}`);
    } else {
      throw new Error("Session history was not updated in MongoDB.");
    }

    if (updatedUser && Object.keys(updatedUser.conceptMap).length > 1) {
      console.log(`✅ Concept map successfully updated! New map size: ${Object.keys(updatedUser.conceptMap).length} concepts.`);
      console.log("Current Concepts:", Object.keys(updatedUser.conceptMap).join(', '));
    } else {
      throw new Error("Concept map was not updated with new concepts.");
    }

    console.log("\n🎉 Step 3 Test fully passed!");

  } catch (err) {
    console.error("\n❌ Test Failed. Here is the error:", err);
  } finally {
    await fastify.close();
  }
}

runStep3Test();
