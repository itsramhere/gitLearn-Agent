import { GitlabMCP } from '../src/mcps/GitlabMCP';
import { config } from 'dotenv';
config();

async function test() {
  const mcp = new GitlabMCP();
  // using a random valid global issue id, or try to get one
  // let's just fetch from the issues API and use the first one
  const headers = { 'PRIVATE-TOKEN': process.env.GITLAB_TOKEN || '' };
  const res = await fetch(`https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/issues?state=opened&per_page=1`, { headers });
  const issues = await res.json();
  if (issues && issues.length > 0) {
    const id = issues[0].id;
    console.log(`Testing with issue ID: ${id}`);
    await mcp.getIssueDetails(id.toString());
  }
}
test();
