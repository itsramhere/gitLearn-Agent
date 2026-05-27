import { config } from 'dotenv';
import { GitlabMCP } from '../src/mcps/GitlabMCP';

config();

async function runGitLabTest() {
  console.log("=== GitLab MCP Diagnostic Test ===\n");
  const gitlab = new GitlabMCP();
  const repoUrl = "https://gitlab.com/gitlab-org/cli";

  console.log(`Target Repository: ${repoUrl}`);

  // Test 1: Fetch a file we know exists at the root (Makefile)
  console.log("\n[Test 1] Attempting to fetch a file that EXISTS at the root (Makefile)...");
  try {
    const makefileContent = await gitlab.fetchFile(repoUrl, "Makefile");
    console.log(`✅ Success! Fetched Makefile. Size: ${makefileContent.length} bytes.`);
    console.log(`Preview of Makefile:\n${makefileContent.substring(0, 100)}...\n`);
  } catch (err: any) {
    console.error(`❌ Failed to fetch Makefile:`, err.message);
  }

  // Test 2: Fetch a file that DOES NOT exist at the root (main.go)
  console.log("\n[Test 2] Attempting to fetch a file that DOES NOT exist at the root (main.go)...");
  console.log("Note: In the gitlab-org/cli repo, main.go is actually located inside 'cmd/glab/main.go'.");
  try {
    await gitlab.fetchFile(repoUrl, "main.go");
    console.log(`✅ Success! Fetched main.go`);
  } catch (err: any) {
    console.error(`❌ Expected Failure! Could not fetch main.go:`, err.message);
    console.log("💡 WHY THIS HAPPENS: When the agent asks Gemini what file to read to explain 'main.go', Gemini guesses the path is just 'main.go'. The GitLab API looks for it at the root of the repository, but it isn't there, so GitLab returns a 404 Not Found error.");
  }

  // Test 3: Fetch the actual path of main.go
  console.log("\n[Test 3] Attempting to fetch main.go using its ACTUAL path (cmd/glab/main.go)...");
  try {
    const actualMainGo = await gitlab.fetchFile(repoUrl, "cmd/glab/main.go");
    console.log(`✅ Success! Fetched cmd/glab/main.go. Size: ${actualMainGo.length} bytes.`);
    console.log(`Preview of main.go:\n${actualMainGo.substring(0, 100)}...\n`);
  } catch (err: any) {
    console.error(`❌ Failed to fetch cmd/glab/main.go:`, err.message);
  }

  // Test 4: Fetch the repository tree
  console.log("\n[Test 4] Attempting to fetch the repository tree (paginated)...");
  try {
    const fileTree = await gitlab.getRepoTree(repoUrl);
    console.log(`✅ Success! Fetched file tree. Total files (blobs) found: ${fileTree.length}`);
    if (fileTree.length > 0) {
      console.log(`Preview of first 5 file paths:\n${fileTree.slice(0, 5).join('\n')}\n`);
    } else {
      console.log("⚠️ Tree fetched successfully, but it was empty.");
    }
  } catch (err: any) {
    console.error(`❌ Failed to fetch repository tree:`, err.message);
  }
}

runGitLabTest();
