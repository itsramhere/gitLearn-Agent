import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';
import { ProfilerAgent } from '../src/agents/ProfilerAgent';
import { ObjectId } from 'mongodb';

// Load the URLs from your .env file
config();

async function runStep2Test() {
  console.log("Starting Step 2 Test: Profiler Agent Isolation...");
  
  const fastify = Fastify({ logger: false });

  try {
    // 1. Register and connect our plugins
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
    await fastify.ready();
    console.log("✅ DB Connections successful!");

    // 2. Instantiate the Profiler Agent
    const profiler = new ProfilerAgent(fastify);
    const newStudentId = new ObjectId().toHexString();

    // 3. Simulate getting interview questions
    const questions = profiler.getInterviewQuestions();
    console.log("\nProfiler Agent asked the following questions:");
    questions.forEach(q => console.log(` - ${q}`));

    // 4. Simulate the student's answers being processed
    console.log("\nSimulating student answers and processing profile...");
    const dummyAnswers = {
      domain: "Frontend React Developer",
      yearsOfExperience: 5,
      familiarity: { "React": "expert", "TypeScript": "advanced", "Python": "none" },
      goals: "I want to learn how to contribute to Python backend projects."
    };

    // The agent will call Gemini to infer the true skill level and save to DBs
    const profileDoc = await profiler.processInterviewAndSave(newStudentId, dummyAnswers);
    console.log(`✅ Profiler processed answers. Inferred Skill Level: ${profileDoc.inferredSkillLevel}`);

    // 5. Verify MongoDB
    console.log("\nVerifying MongoDB 'users' collection...");
    const usersCollection = fastify.mongo.db.collection('users');
    const fetchedUser = await usersCollection.findOne({ _id: new ObjectId(newStudentId) });
    
    if (fetchedUser && fetchedUser.profile.domain === dummyAnswers.domain) {
      console.log(`✅ MongoDB Write Success! Found user ${newStudentId} with initialized conceptMap and sessionHistory arrays.`);
    } else {
      throw new Error("User document missing or malformed in MongoDB.");
    }

    // 6. Verify Elastic
    console.log("\nVerifying Elastic 'user_profiles' index...");
    // Refresh the index so it's immediately searchable
    await fastify.elastic.indices.refresh({ index: 'user_profiles' });
    
    const searchRes = await fastify.elastic.search({
      index: 'user_profiles',
      q: "Frontend"
    });
    
    const foundProfile = searchRes.hits.hits.find(hit => hit._id === newStudentId);
    if (foundProfile) {
      console.log(`✅ Elastic Write Success! Profile was successfully indexed for similarity search.`);
    } else {
      throw new Error("Profile document missing from Elastic index.");
    }

    console.log("\n🎉 Step 2 Test fully passed!");

  } catch (err) {
    console.error("\n❌ Test Failed. Here is the error:", err);
  } finally {
    await fastify.close();
  }
}

runStep2Test();
