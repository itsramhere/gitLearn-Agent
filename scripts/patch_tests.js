const fs = require('fs');
const path = require('path');
const testsDir = 'tests';
const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const fp = path.join(testsDir, f);
  let code = fs.readFileSync(fp, 'utf8');
  let modified = false;

  // Update import to include ElasticMCPClient and MongoMCPClient
  if (code.includes("from '../src/core/mcpClient'") && !code.includes('ElasticMCPClient')) {
    code = code.replace(
      /import \{ GitlabMCPClient \} from '\.\.\/src\/core\/mcpClient';/,
      "import { GitlabMCPClient, ElasticMCPClient, MongoMCPClient } from '../src/core/mcpClient';"
    );
    modified = true;
  }

  // Fix IssueMatcherAgent constructor: add elasticMcp param
  if (code.includes('IssueMatcherAgent(fastify, gitlabMcp)')) {
    code = code.replace(
      /new IssueMatcherAgent\(fastify, gitlabMcp\)/g,
      'new IssueMatcherAgent(fastify, gitlabMcp, new ElasticMCPClient())'
    );
    modified = true;
  }

  // Fix CodeExplainerAgent constructor: add mongoMcp param
  // Handles both old patterns
  if (code.includes('CodeExplainerAgent(new UserRepository(fastify.mongo.db), gitlabMcp)')) {
    code = code.replace(
      /new CodeExplainerAgent\(new UserRepository\(fastify\.mongo\.db\), gitlabMcp\)/g,
      'new CodeExplainerAgent(new UserRepository(fastify.mongo.db), gitlabMcp, new MongoMCPClient())'
    );
    modified = true;
  }
  if (code.includes('CodeExplainerAgent(userRepository, gitlabMcp)')) {
    code = code.replace(
      /new CodeExplainerAgent\(userRepository, gitlabMcp\)/g,
      'new CodeExplainerAgent(userRepository, gitlabMcp, new MongoMCPClient())'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fp, code);
    console.log('Patched:', f);
  }
});
