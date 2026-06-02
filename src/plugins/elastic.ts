import fp from 'fastify-plugin';
import { Client } from '@elastic/elasticsearch';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    elastic: Client;
  }
}

export interface ElasticPluginOptions {
  node?: string;
}

export default fp(async (fastify: FastifyInstance, options: ElasticPluginOptions) => {
  const node = options.node || process.env.ELASTIC_NODE || 'https://localhost:9200';
  const isLocal = node.includes("localhost") || node.includes("127.0.0.1");
  
  const clientOptions: any = { 
    node,
    ...(isLocal && { tls: { rejectUnauthorized: false } })
  };
  if (process.env.ELASTIC_API_KEY) {
    clientOptions.auth = { apiKey: process.env.ELASTIC_API_KEY };
  } else if (process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD) {
    clientOptions.auth = {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD
    };
  }

  const client = new Client(clientOptions);

  try {
    // 1. Issues Index Mapping
    const issuesIndex = 'issues';
    const issuesExists = await client.indices.exists({ index: issuesIndex });
    
    if (!issuesExists) {
      await client.indices.create({
        index: issuesIndex,
        mappings: {
          properties: {
            title: { type: 'text' },
            description: { type: 'text' },
            labels: { type: 'keyword' },
            complexity: { type: 'keyword' },
            status: { type: 'keyword' }
          }
        }
      });
    }

    // 2. User Profiles Index Mapping
    const profilesIndex = 'user_profiles';
    const profilesExists = await client.indices.exists({ index: profilesIndex });
    
    if (!profilesExists) {
      await client.indices.create({
        index: profilesIndex,
        mappings: {
          properties: {
            domain: { type: 'keyword' },
            techStack: { type: 'keyword' },
            yearsOfExperience: { type: 'integer' },
            proficiency: { type: 'keyword' },
            profileText: { type: 'text' } 
          }
        }
      });
    }

    // 3. Solver Notes Index Mapping
    const solverNotesIndex = 'solver_notes';
    const notesExists = await client.indices.exists({ index: solverNotesIndex });
    
    if (!notesExists) {
      await client.indices.create({
        index: solverNotesIndex,
        mappings: {
          properties: {
            issueId: { type: 'keyword' },
            solverId: { type: 'keyword' },
            tips: { 
              type: 'text',
              analyzer: 'standard'
            },
            timestamp: { type: 'date' }
          }
        }
      });
    }
  } catch (err: any) {
    fastify.log.error(`Failed to initialize Elastic indices: ${err.message}`);
  }

  fastify.decorate('elastic', client);

  fastify.addHook('onClose', async (instance) => {
    await instance.elastic.close();
  });
});
