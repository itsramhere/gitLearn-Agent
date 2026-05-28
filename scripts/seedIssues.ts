import { MongoClient } from 'mongodb';
import { Client as ElasticClient } from '@elastic/elasticsearch';
import { config } from 'dotenv';

config();

const MONGO_URI = process.env.MONGO_URI || '';
const ELASTIC_NODE = process.env.ELASTIC_NODE || 'http://localhost:9200';
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || '';
const PROJECT_PATH = 'gitlab-org%2Fcli';

async function seed() {
  console.log('Connecting to MongoDB...');
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const db = mongoClient.db();
  const issuesCollection = db.collection('issues');

  console.log('Connecting to Elasticsearch...');
  const elasticOptions: any = { node: ELASTIC_NODE };
  if (process.env.ELASTIC_API_KEY) {
    elasticOptions.auth = { apiKey: process.env.ELASTIC_API_KEY };
  } else if (process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD) {
    elasticOptions.auth = {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD,
    };
  }
  const elasticClient = new ElasticClient(elasticOptions);

  console.log('Fetching open issues from GitLab...');
  const headers = {
    'Authorization': `Bearer ${GITLAB_TOKEN}`,
  };

  // Fetch latest 50 opened issues
  const res1 = await fetch(`https://gitlab.com/api/v4/projects/${PROJECT_PATH}/issues?state=opened&per_page=50`, { headers });
  const allIssues = await res1.json();

  if (!Array.isArray(allIssues)) {
    console.error('Failed to fetch issues or received non-array response.');
    console.log(allIssues);
    process.exit(1);
  }

  console.log(`Fetched ${allIssues.length} unique issues.`);

  if (allIssues.length === 0) {
    console.log('No issues found. Exiting.');
    await mongoClient.close();
    await elasticClient.close();
    return;
  }

  console.log('Deleting existing dummy issues from MongoDB...');
  await issuesCollection.deleteMany({});

  console.log('Deleting existing dummy issues from Elasticsearch...');
  try {
    await elasticClient.deleteByQuery({
      index: 'issues',
      query: { match_all: {} }
    });
  } catch (err: any) {
    if (err.meta?.statusCode === 404) {
      console.log('Index not found, skipping delete.');
    } else {
      throw err;
    }
  }

  console.log('Inserting issues into MongoDB and Elasticsearch...');
  for (const issue of allIssues) {
    const gitlabIssueId = issue.id.toString();
    const iid = issue.iid.toString();
    const projectPath = 'gitlab-org/cli';

    // MongoDB
    await issuesCollection.insertOne({
      gitlabIssueId,
      iid,
      projectPath,
      status: 'unsolved',
      record: issue,
    });

    // Elasticsearch
    const safeLabels = issue.labels || [];
    await elasticClient.index({
      index: 'issues',
      id: gitlabIssueId,
      document: {
        title: issue.title,
        description: issue.description,
        labels: safeLabels,
        iid,
        projectPath,
        complexity: safeLabels.includes('good first issue') ? 'beginner' : 'intermediate',
        status: 'unsolved',
      }
    });
  }

  // Refresh Elasticsearch index to make documents immediately searchable
  await elasticClient.indices.refresh({ index: 'issues' });

  console.log(`Successfully seeded ${allIssues.length} issues!`);

  await mongoClient.close();
  await elasticClient.close();
}

seed().catch(console.error);
