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
  const node = options.node || process.env.ELASTIC_NODE || 'http://localhost:9200';
  
  const clientOptions: any = { node };
  if (process.env.ELASTIC_API_KEY) {
    clientOptions.auth = { apiKey: process.env.ELASTIC_API_KEY };
  } else if (process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD) {
    clientOptions.auth = {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD
    };
  }

  const client = new Client(clientOptions);

  // 1. Issues Index Mapping
  // Fields required: title, description, labels, complexity, current status
  const issuesIndex = 'issues';
  const issuesExists = await client.indices.exists({ index: issuesIndex });
  
  if (!issuesExists) {
    await client.indices.create({
      index: issuesIndex,
      mappings: {
        properties: {
          title: { type: 'text' },
          description: { type: 'text' },
          labels: { type: 'keyword' }, // keyword for exact matching/filtering
          complexity: { type: 'keyword' },
          status: { type: 'keyword' } // unsolved, claimed, solved
        }
      }
    });
  }

  // 2. User Profiles Index Mapping
  // Fields required: domain, tech stack, YoE, proficiency (for similarity search)
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
          // If doing semantic similarity search via Gemini embeddings in the future,
          // we can add a dense_vector field here. For now, we optimize for standard
          // similarity matching (BM25 or term filtering).
          profileText: { type: 'text' } 
        }
      }
    });
  }

  // 3. Solver Notes Index Mapping
  // Fields required: free-text tips from students who have solved each issue
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
            analyzer: 'standard' // optimized for full-text search across tips
          },
          timestamp: { type: 'date' }
        }
      }
    });
  }

  fastify.decorate('elastic', client);

  fastify.addHook('onClose', async (instance) => {
    await instance.elastic.close();
  });
});
