import fp from 'fastify-plugin';
import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
    };
  }
}

export interface MongoPluginOptions {
  url?: string;
}

export default fp(async (fastify: FastifyInstance, options: MongoPluginOptions) => {
  const url = options.url || process.env.MONGO_URI || 'mongodb://localhost:27017/gitlearn';
  
  const client = new MongoClient(url, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  const db = client.db();

  // 1. Users Collection
  // Contains full profile, session history, claimed/solved issues, and concept map
  const usersCollectionName = 'users';
  const existingUsers = await db.listCollections({ name: usersCollectionName }).toArray();
  
  if (existingUsers.length === 0) {
    await db.createCollection(usersCollectionName, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['profile'],
          properties: {
            profile: {
              bsonType: 'object',
              required: ['domain', 'yearsOfExperience', 'familiarity', 'goals', 'inferredSkillLevel'],
              properties: {
                domain: { bsonType: 'string' },
                yearsOfExperience: { bsonType: 'number' },
                familiarity: { bsonType: 'object' }, 
                goals: { bsonType: 'string' },
                inferredSkillLevel: { bsonType: 'string' }
              }
            },
            sessionHistory: {
              bsonType: 'array',
              items: { bsonType: 'object' } // Stores session logs (what was explained/understood)
            },
            conceptMap: {
              bsonType: 'object' // Represents the cumulative knowledge graph
            },
            claimedIssues: {
              bsonType: 'array',
              items: { bsonType: 'string' } // Array of issue IDs
            },
            solvedIssues: {
              bsonType: 'array',
              items: { bsonType: 'string' } // Array of issue IDs
            }
          }
        }
      }
    });
  }

  // 2. Issues Collection
  // Contains complete issue record, status, TTL lock (expiresAt), and solver ID
  const issuesCollectionName = 'issues';
  const existingIssues = await db.listCollections({ name: issuesCollectionName }).toArray();
  
  if (existingIssues.length === 0) {
    await db.createCollection(issuesCollectionName, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['gitlabIssueId', 'status'],
          properties: {
            gitlabIssueId: { bsonType: 'string' },
            status: { enum: ['unsolved', 'claimed', 'solved'] },
            solverId: { bsonType: 'objectId' },
            expiresAt: { bsonType: 'date' }, // TTL lock timestamp
            record: { bsonType: 'object' }   // Complete issue record fetched from GitLab
          }
        }
      }
    });
  }

  // Set up the TTL index on the 'expiresAt' field
  // Documents expire automatically at the specified date/time
  await db.collection(issuesCollectionName).createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );

  // 3. Solutions Collection
  // Contains solver ID, issue ID, tips/notes, and timestamp
  const solutionsCollectionName = 'solutions';
  const existingSolutions = await db.listCollections({ name: solutionsCollectionName }).toArray();
  
  if (existingSolutions.length === 0) {
    await db.createCollection(solutionsCollectionName, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['solverId', 'issueId', 'tips', 'timestamp'],
          properties: {
            solverId: { bsonType: 'objectId' },
            issueId: { bsonType: 'string' },
            tips: { bsonType: 'string' },
            timestamp: { bsonType: 'date' }
          }
        }
      }
    });
  }

  fastify.decorate('mongo', { client, db });

  fastify.addHook('onClose', async (instance) => {
    await instance.mongo.client.close();
  });
});
