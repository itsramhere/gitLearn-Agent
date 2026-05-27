import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';
import { GitlabMCP } from '../src/mcps/GitlabMCP';
import { IssueMatcherAgent } from '../src/agents/IssueMatcherAgent';
import { ProgressTrackerAgent } from '../src/agents/ProgressTrackerAgent';
import { ObjectId } from 'mongodb';

config();

async function runStep5Test() {
  console.log("Starting Step 5 Test: Progress Tracker Agent...");
  
  const fastify = Fastify({ logger: false });

  try {
    // 1. Connect Databases
    await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
    await fastify.ready();
    console.log("✅ DB Connections successful!");

    const gitlabMcp = new GitlabMCP();
    const matcher = new IssueMatcherAgent(fastify, gitlabMcp);
    const tracker = new ProgressTrackerAgent(fastify, gitlabMcp);

    const studentId = new ObjectId().toHexString();
    const issueId = "backend-issue-1"; // Assuming this was seeded in Step 4

    // 2. Claim the issue
    console.log(`\nClaiming issue #${issueId}...`);
    await matcher.claimIssue(studentId, issueId);
    console.log("✅ Issue successfully claimed (48-hour TTL lock applied).");

    // 3. Simulate PR verification
    const prUrl = "https://gitlab.com/example/repo/-/merge_requests/1";
    console.log(`\nVerifying PR at ${prUrl}...`);
    const verificationMessage = await tracker.verifySolveAndAskForTips(issueId, prUrl);
    console.log(`🤖 Agent says: "${verificationMessage}"`);

    // 4. Simulate the student providing tips
    const studentTips = "Make sure to import the logging module at the top of the file, otherwise it throws a circular dependency error!";
    console.log(`\nStudent provides tips: "${studentTips}"`);
    console.log("Processing tips and updating DBs...");
    await tracker.processSolveTips(studentId, issueId, studentTips);

    // 5. Verify MongoDB Updates
    console.log("\nVerifying MongoDB Updates...");
    const issuesCollection = fastify.mongo.db.collection('issues');
    const updatedIssue = await issuesCollection.findOne({ gitlabIssueId: issueId });
    if (updatedIssue && updatedIssue.status === 'solved') {
      console.log("✅ MongoDB 'issues' collection status is 'solved'.");
    } else {
      throw new Error("MongoDB 'issues' collection was not updated to 'solved'.");
    }

    const solutionsCollection = fastify.mongo.db.collection('solutions');
    const solutionRecord = await solutionsCollection.findOne({ issueId });
    if (solutionRecord && solutionRecord.tips === studentTips) {
      console.log("✅ MongoDB 'solutions' collection successfully captured the tips!");
    } else {
      throw new Error("MongoDB 'solutions' collection did not save the tips.");
    }

    // 6. Verify Elastic Updates
    console.log("\nVerifying Elastic Updates...");
    await fastify.elastic.indices.refresh({ index: 'issues' });
    await fastify.elastic.indices.refresh({ index: 'solver_notes' });

    const issueSearch = await fastify.elastic.get({ index: 'issues', id: issueId });
    if ((issueSearch._source as any).status === 'solved') {
      console.log("✅ Elastic 'issues' index status is 'solved'.");
    } else {
      throw new Error("Elastic 'issues' index was not updated.");
    }

    const notesSearch = await fastify.elastic.search({
      index: 'solver_notes',
      q: "circular dependency"
    });
    
    if (notesSearch.hits.hits.length > 0) {
      console.log("✅ Elastic 'solver_notes' index successfully captured the searchable tips!");
    } else {
      throw new Error("Elastic 'solver_notes' index did not save the tips.");
    }

    console.log("\n🎉 Step 5 Test fully passed!");

  } catch (err) {
    console.error("\n❌ Test Failed. Here is the error:", err);
  } finally {
    await fastify.close();
  }
}

runStep5Test();
