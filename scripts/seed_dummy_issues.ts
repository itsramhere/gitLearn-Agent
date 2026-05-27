import Fastify from 'fastify';
import { config } from 'dotenv';
import mongoPlugin from '../src/plugins/mongodb';
import elasticPlugin from '../src/plugins/elastic';

config();

async function seed() {
  const fastify = Fastify({ logger: false });
  await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
  await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE as string });
  await fastify.ready();

  const issuesCollection = fastify.mongo.db.collection('issues');

  const dummyIssues = [
    {
      gitlabIssueId: "dummy-issue-100",
      title: "Backend: Fix Database Connection Pool Exhaustion",
      description: "When traffic spikes, the MongoDB connection pool runs out of available sockets. We need to implement proper connection pooling and pooling limits in the backend configuration.",
      labels: ["backend", "database", "mongodb", "nodejs"],
      complexity: "advanced"
    },
    {
      gitlabIssueId: "dummy-issue-101",
      title: "Frontend: Add Loading Spinner to Auth Form",
      description: "Users are clicking the login button multiple times because there is no visual feedback. Add a React loading spinner component while the authentication request is in flight.",
      labels: ["frontend", "react", "ui", "beginner"],
      complexity: "beginner"
    },
    {
      gitlabIssueId: "dummy-issue-102",
      title: "Backend: Validate User Email Format",
      description: "Currently, users can register with invalid email addresses. We need to add regex validation to the registration route to ensure the email format is correct before writing to the database.",
      labels: ["backend", "validation", "regex", "javascript"],
      complexity: "intermediate"
    }
  ];

  console.log("Seeding dummy issues into MongoDB and Elasticsearch...");

  for (const issue of dummyIssues) {
    // 1. MongoDB
    await issuesCollection.updateOne(
      { gitlabIssueId: issue.gitlabIssueId },
      {
        $set: {
          status: 'unsolved',
          record: issue
        }
      },
      { upsert: true }
    );

    // 2. Elasticsearch
    await fastify.elastic.index({
      index: 'issues',
      id: issue.gitlabIssueId,
      document: {
        title: issue.title,
        description: issue.description,
        labels: issue.labels.join(' '),
        complexity: issue.complexity,
        status: 'unsolved'
      }
    });
    console.log(`✅ Inserted ${issue.gitlabIssueId}`);
  }

  // Refresh Elasticsearch index to make documents immediately searchable
  await fastify.elastic.indices.refresh({ index: 'issues' });

  await fastify.close();
  console.log("\n🎉 Seeding complete!");
}

seed().catch(console.error);
