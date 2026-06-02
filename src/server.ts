import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { ObjectId } from 'mongodb';

import mongoPlugin from './plugins/mongodb';
import elasticPlugin from './plugins/elastic';

import { GitlabMCPClient, ElasticMCPClient, MongoMCPClient } from './core/mcpClient';
import { ProfilerAgent } from './agents/ProfilerAgent';
import { CodeExplainerAgent } from './agents/CodeExplainerAgent';
import { IssueMatcherAgent } from './agents/IssueMatcherAgent';
import { ProgressTrackerAgent } from './agents/ProgressTrackerAgent';
import { OrchestratorAgent } from './agents/OrchestratorAgent';
import { UserRepository } from './repositories/UserRepository';

config();

const fastify = Fastify({ logger: true });

async function buildServer() {
  // Register CORS for React Frontend
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(url => url.trim()) 
    : ['http://localhost:5173'];

  await fastify.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Register DB Plugins
  await fastify.register(mongoPlugin, { url: process.env.MONGO_URI as string });
  
  if (process.env.ELASTIC_NODE) {
    await fastify.register(elasticPlugin, { node: process.env.ELASTIC_NODE });
  } else {
    fastify.log.warn("ELASTIC_NODE not found in environment, elastic plugin may fail if required.");
    // Attempt registration anyway if the plugin has defaults
    await fastify.register(elasticPlugin, {});
  }

  // Instantiate and Connect MCPs
  const gitlabMcp = new GitlabMCPClient();
  await gitlabMcp.connect();
  const elasticMcp = new ElasticMCPClient();
  await elasticMcp.connect();
  const mongoMcp = new MongoMCPClient();
  await mongoMcp.connect();
  // Instantiate Repositories
  const userRepository = new UserRepository(fastify.mongo.db);
  // Instantiate Agents
  const profiler = new ProfilerAgent(fastify);
  const explainer = new CodeExplainerAgent(userRepository, gitlabMcp, mongoMcp);
  const matcher = new IssueMatcherAgent(fastify, gitlabMcp, elasticMcp);
  const tracker = new ProgressTrackerAgent(fastify, gitlabMcp);
  
  const orchestrator = new OrchestratorAgent(
    fastify,
    profiler,
    explainer,
    matcher,
    tracker
  );

  // Authentication Middleware
  const requireAuth = async (request: any, reply: any) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const response = await fetch('https://gitlab.com/api/v4/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const gitlabUser = await response.json();
      // Attach the user object to the request for subsequent handlers to use if needed
      request.gitlabUser = gitlabUser;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  };

  // 1. GET /api/student/:studentId
  fastify.get('/api/student/:studentId', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId } = request.params as { studentId: string };
    try {
      const usersCollection = fastify.mongo.db.collection('users');
      const issuesCollection = fastify.mongo.db.collection('issues');
      
      const userDoc = await usersCollection.findOne({ _id: new ObjectId(studentId) });
      if (!userDoc) {
        return reply.status(404).send({ error: 'Student not found' });
      }

      const claimedIssue = await issuesCollection.findOne({
        solverId: new ObjectId(studentId),
        status: 'claimed'
      });

      return reply.send({
        profile: userDoc.profile || {},
        conceptMap: userDoc.conceptMap || { filesExplained: [], conceptsUnderstood: [], conceptsConfused: [] },
        claimedIssue: claimedIssue || null
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 1.5. PUT /api/student/:studentId/profile
  fastify.put('/api/student/:studentId/profile', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId } = request.params as { studentId: string };
    const profileData = request.body;
    
    try {
      const usersCollection = fastify.mongo.db.collection('users');
      
      // Update the user's profile field
      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(studentId) },
        { $set: { profile: profileData } },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.status(404).send({ error: 'Student not found' });
      }

      return reply.send({ success: true, profile: result.profile });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. POST /api/chat
  fastify.post('/api/chat', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId, message, repoUrl } = request.body as { studentId: string; message: string; repoUrl: string };
    try {
      const response = await orchestrator.handleMessage(studentId, message, repoUrl);
      return reply.send({ response });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. POST /api/claim
  fastify.post('/api/claim', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId, issueId } = request.body as { studentId: string; issueId: string };
    try {
      const updatedIssue = await matcher.claimIssue(studentId, issueId);
      return reply.send(updatedIssue);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 4. POST /api/release
  fastify.post('/api/release', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId, issueId } = request.body as { studentId: string; issueId: string };
    try {
      const message = await tracker.processExpiredClaim(studentId, issueId);
      return reply.send({ success: true, message });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // 4b. POST /api/solve
  fastify.post('/api/solve', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId, issueId, prUrl } = request.body as { studentId: string; issueId: string; prUrl: string };
    try {
      // Step 1: Verify the PR and get confirmation message
      const verifyMsg = await tracker.verifySolveAndAskForTips(issueId, prUrl);
      
      if (verifyMsg.includes("I couldn't find a pull request")) {
        throw new Error(verifyMsg);
      }

      // Step 2: Mark as solved with an empty tips placeholder (student can provide tips via chat later)
      await tracker.processSolveTips(studentId, issueId, '');

      return reply.send({ success: true, message: verifyMsg });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });
  // 4c. POST /api/admin/sync-issues
  fastify.post('/api/admin/sync-issues', async (request: any, reply: any) => {
    // Basic Admin Authorization
    const adminKey = request.headers['x-admin-key'];
    if (!process.env.ADMIN_SECRET_KEY) {
      fastify.log.warn('ADMIN_SECRET_KEY is not set. Admin endpoints are disabled for security.');
      return reply.status(403).send({ error: 'Admin endpoints disabled.' });
    }
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return reply.status(401).send({ error: 'Unauthorized. Invalid or missing X-Admin-Key header.' });
    }

    const { repoUrl } = request.body as { repoUrl: string };
    try {
      if (!repoUrl) {
        return reply.status(400).send({ error: 'repoUrl is required' });
      }
      
      const gitlabToken = process.env.GITLAB_TOKEN || '';
      let projectPath = repoUrl.replace(/^https?:\/\/[^\/]+\//, '').replace(/\.git$/, '');
      const encodedProjectPath = encodeURIComponent(projectPath);

      fastify.log.info(`Syncing issues for project: ${projectPath}`);

      const headers = {
        'Authorization': `Bearer ${gitlabToken}`,
      };

      const res = await fetch(`https://gitlab.com/api/v4/projects/${encodedProjectPath}/issues?state=opened&per_page=50`, { headers });
      if (!res.ok) {
        throw new Error(`GitLab API returned status ${res.status}`);
      }
      const allIssues = await res.json();

      if (!Array.isArray(allIssues)) {
        throw new Error('Failed to fetch issues or received non-array response from GitLab.');
      }

      const issuesCollection = fastify.mongo.db.collection('issues');

      // Delete existing issues for this project path
      await issuesCollection.deleteMany({ projectPath });
      
      try {
        await fastify.elastic.deleteByQuery({
          index: 'issues',
          query: { match: { projectPath } }
        });
      } catch (err: any) {
        if (err.meta?.statusCode !== 404) {
          fastify.log.warn('Elasticsearch deleteByQuery error:', err);
        }
      }

      if (allIssues.length === 0) {
        return reply.send({ success: true, message: 'No open issues found.', count: 0 });
      }

      for (const issue of allIssues) {
        const gitlabIssueId = issue.id.toString();
        const iid = issue.iid.toString();
        const safeLabels = issue.labels || [];

        // MongoDB
        await issuesCollection.insertOne({
          gitlabIssueId,
          iid,
          projectPath,
          status: 'unsolved',
          record: issue,
        });

        // Elasticsearch
        await fastify.elastic.index({
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

      await fastify.elastic.indices.refresh({ index: 'issues' });
      
      return reply.send({ success: true, count: allIssues.length, message: `Successfully synced ${allIssues.length} issues.` });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });


  // 5. GET /api/issues/:studentId
  fastify.get('/api/issues/:studentId', { preHandler: [requireAuth] }, async (request: any, reply: any) => {
    const { studentId } = request.params as { studentId: string };
    try {
      const usersCollection = fastify.mongo.db.collection('users');
      const userDoc = await usersCollection.findOne({ _id: new ObjectId(studentId) });
      if (!userDoc) {
        return reply.status(404).send({ error: 'Student not found' });
      }

      const topIssues = await matcher.matchAndRecommendIssues(
        studentId, 
        userDoc.profile, 
        userDoc.conceptMap
      );
      
      return reply.send(topIssues);
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });
  // ============================================================================
  // GitLab OAuth Endpoints
  // ============================================================================

  // 6. GET /auth/gitlab — Redirect user to GitLab's OAuth authorization page
  fastify.get('/auth/gitlab', async (_request: any, reply: any) => {
    const clientId = process.env.GITLAB_CLIENT_ID;
    const redirectUri = process.env.GITLAB_REDIRECT_URI || 'http://localhost:5173/auth/callback';
    const scopes = 'openid profile email read_api';

    if (!clientId) {
      return reply.status(500).send({ error: 'GITLAB_CLIENT_ID is not configured on the server.' });
    }

    const authUrl = new URL('https://gitlab.com/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);

    return reply.redirect(authUrl.toString());
  });

  // 7. GET /auth/callback — Exchange authorization code for access token, fetch profile, upsert user
  fastify.get('/auth/callback', async (request: any, reply: any) => {
    const { code } = request.query as { code: string };

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code from GitLab.' });
    }

    const clientId = process.env.GITLAB_CLIENT_ID;
    const clientSecret = process.env.GITLAB_CLIENT_SECRET;
    const redirectUri = process.env.GITLAB_REDIRECT_URI || 'http://localhost:5173/auth/callback';

    if (!clientId || !clientSecret) {
      return reply.status(500).send({ error: 'GITLAB_CLIENT_ID or GITLAB_CLIENT_SECRET is not configured.' });
    }

    try {
      // Step 1: Exchange the authorization code for an access token
      console.log(`[Auth] Received authorization code: ${code}`);
      const tokenRequestBody = {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      };
      console.log(`[Auth] redirect_uri being sent: ${redirectUri}`);
      console.log(`[Auth] Requesting token with body:`, JSON.stringify(tokenRequestBody));

      const tokenResponse = await fetch('https://gitlab.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenRequestBody),
      });

      console.log(`[Auth] Token exchange response status: ${tokenResponse.status} ${tokenResponse.statusText}`);
      const tokenResponseBody = await tokenResponse.text();
      console.log(`[Auth] Token exchange response body:`, tokenResponseBody);

      if (!tokenResponse.ok) {
        fastify.log.error(`GitLab token exchange failed: ${tokenResponseBody}`);
        return reply.status(502).send({ error: 'Failed to exchange authorization code with GitLab.' });
      }

      const tokenData = JSON.parse(tokenResponseBody) as { access_token: string };
      const accessToken = tokenData.access_token;

      // Step 2: Fetch the user's GitLab profile using the access token
      const profileResponse = await fetch('https://gitlab.com/api/v4/user', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!profileResponse.ok) {
        const errorBody = await profileResponse.text();
        fastify.log.error(`GitLab profile fetch failed: ${errorBody}`);
        return reply.status(502).send({ error: 'Failed to fetch user profile from GitLab.' });
      }

      const gitlabProfile = await profileResponse.json() as {
        id: number;
        username: string;
        avatar_url: string;
        email: string;
      };

      // Step 3: Upsert user document in MongoDB (match on gitlabId)
      const usersCollection = fastify.mongo.db.collection('users');

      const result = await usersCollection.findOneAndUpdate(
        { gitlabId: gitlabProfile.id },
        {
          $set: {
            gitlabId: gitlabProfile.id,
            gitlabUsername: gitlabProfile.username,
            gitlabAvatarUrl: gitlabProfile.avatar_url,
            email: gitlabProfile.email,
          },
          $setOnInsert: {
            profile: {
              domain: '',
              yearsOfExperience: 0,
              familiarity: {},
              goals: '',
              inferredSkillLevel: '1'
            },
            conceptMap: { filesExplained: [], conceptsUnderstood: [], conceptsConfused: [] },
            sessionHistory: [],
            claimedIssues: [],
            solvedIssues: [],
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      const userDoc = result?.value || result;
      const studentId = (userDoc as any)._id.toString();

      return reply.send({
        studentId,
        gitlabUsername: gitlabProfile.username,
        gitlabAvatarUrl: gitlabProfile.avatar_url,
        accessToken,
        email: gitlabProfile.email,
      });

    } catch (err: any) {
      console.error(`[Auth] Token exchange/user fetch failed with error:`, err.stack || err);
      fastify.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  return fastify;
}

if (require.main === module) {
  buildServer().then(async (app) => {
    try {
      await app.listen({ port: 3000, host: '0.0.0.0' });
      console.log(`GitLearn backend server listening at http://localhost:3000`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}

export default buildServer;
