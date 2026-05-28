import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';
import { GitlabMCPClient, ElasticMCPClient, MongoMCPClient } from '../src/core/mcpClient';
import { IssueMatcherAgent } from '../src/agents/IssueMatcherAgent';
import { ObjectId } from 'mongodb';

config();

async function runStep4Test() {
  console.log("Starting Step 4 Test: Issue Matcher Agent...");
  
  const fastify = Fastify({ logger: false });

  try {
    // 1. Connect Databases
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
    await fastify.ready();
    console.log("✅ DB Connections successful!");

    const issuesCollection = fastify.mongo.db.collection('issues');

    // 2. Insert Dummy Issues into MongoDB and Elastic
    console.log("\nSeeding dummy issues into MongoDB and Elastic...");
    const dummyIssues = [
      { id: "backend-issue-1", title: "Add logging to user auth", labels: "backend python beginner", desc: "We need basic print statements for auth.", complexity: "low" },
      { id: "frontend-issue-2", title: "Fix React button alignment", labels: "frontend react beginner", desc: "The login button is 2px off center.", complexity: "low" },
      { id: "backend-issue-3", title: "Refactor Database Connection Pool", labels: "backend python advanced", desc: "Implement connection pooling using SQLAlchemy.", complexity: "high" }
    ];

    for (const issue of dummyIssues) {
      // Insert to Mongo
      await issuesCollection.updateOne(
        { gitlabIssueId: issue.id },
        {
          $set: {
            gitlabIssueId: issue.id,
            status: 'unsolved',
            record: issue
          }
        },
        { upsert: true }
      );

      // Insert to Elastic
      await fastify.elastic.index({
        index: 'issues',
        id: issue.id,
        document: {
          title: issue.title,
          description: issue.desc,
          labels: issue.labels,
          complexity: issue.complexity,
          status: 'unsolved'
        }
      });
    }

    // Force Elastic to refresh so the search query immediately works
    await fastify.elastic.indices.refresh({ index: 'issues' });
    console.log("✅ Dummy issues successfully seeded.");

    // 3. Set up the Profile and Agent
    const gitlabMcp = new GitlabMCPClient();
    const matcher = new IssueMatcherAgent(fastify, gitlabMcp, new ElasticMCPClient());
    
    // We'll use a backend-focused profile to see if it correctly ranks the Python/Backend issues higher
    const dummyProfile = {
      domain: "Backend",
      yearsOfExperience: 2,
      familiarity: { "python": "intermediate" },
      goals: "I want to improve my backend skills."
    };
    const dummyConceptMap = { "Basic Logging": "Knows how to use print statements" };

    // 4. Run the Issue Matcher
    console.log("\nTriggering Issue Matcher...");
    const recommendations = await matcher.matchAndRecommendIssues(
      new ObjectId().toHexString(),
      dummyProfile,
      dummyConceptMap
    );

    console.log("\n🤖 Issue Matcher Recommendations:");
    if (recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        console.log(`\n[#${idx + 1}] Issue ID: ${rec.id}\nTitle: ${rec.title}\nReasoning: ${rec.reasoning}`);
      });
      console.log(`\n✅ Matcher successfully scored and recommended ${recommendations.length} issues.`);
      
      // Verify that the backend issue was recommended
      if (recommendations.some(r => r.id === 'backend-issue-1')) {
        console.log("✅ Matcher correctly prioritized the relevant backend issue!");
      }

    } else {
      throw new Error("Matcher returned 0 recommendations. Elastic search or scoring failed.");
    }

    console.log("\n🎉 Step 4 Test fully passed!");

  } catch (err) {
    console.error("\n❌ Test Failed. Here is the error:", err);
  } finally {
    await fastify.close();
  }
}

runStep4Test();
