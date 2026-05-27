import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';
import { ObjectId } from 'mongodb';

// Load the URLs from your .env file
config();

async function runStep1Test() {
  console.log("Starting Step 1 Test: Connecting to MongoDB and Elastic...");
  
  const fastify = Fastify({ logger: false });

  try {
    // 1. Register and connect our plugins
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
    
    // Wait for Fastify to fully initialize the connections
    await fastify.ready();
    console.log("✅ Connections successful!");

    // 2. Test MongoDB: Write a dummy user profile
    const usersCollection = fastify.mongo.db.collection('users');
    const dummyId = new ObjectId();
    
    console.log("\nWriting dummy user profile to MongoDB...");
    await usersCollection.insertOne({
      _id: dummyId,
      profile: {
        domain: "Backend",
        yearsOfExperience: 3,
        familiarity: { "python": "intermediate", "node": "beginner" },
        goals: "Learn open source",
        inferredSkillLevel: "Intermediate"
      },
      sessionHistory: [],
      conceptMap: {},
      claimedIssues: [],
      solvedIssues: []
    });
    
    const fetchedUser = await usersCollection.findOne({ _id: dummyId });
    if (fetchedUser) {
      console.log(`✅ MongoDB Write Success! Fetched User Domain: ${fetchedUser.profile.domain}`);
    }

    // 3. Test Elastic: Index a dummy issue
    console.log("\nIndexing dummy issue to Elastic 'issues' index...");
    await fastify.elastic.index({
      index: 'issues',
      id: "dummy-issue-999",
      body: {
        title: "Fix login bug",
        description: "Users cannot log in when using Firefox",
        labels: "backend python intermediate",
        complexity: "medium",
        status: "unsolved"
      },
      refresh: true // Force immediate visibility for our test search
    });

    const searchRes = await fastify.elastic.search({
      index: 'issues',
      q: "login"
    });
    
    if (searchRes.hits.hits.length > 0) {
      console.log(`✅ Elastic Write Success! Found issue: ${(searchRes.hits.hits[0]._source as any)?.title}`);
    }

    console.log("\n🎉 Step 1 Test fully passed!");

  } catch (err) {
    console.error("\n❌ Test Failed. Here is the error:", err);
  } finally {
    // Clean up connections
    await fastify.close();
  }
}

runStep1Test();
