import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import process from 'process';

const server = new Server(
  {
    name: "gitlab-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Strict Input Schemas
const FetchFileSchema = z.object({
  repoUrl: z.string().url().describe("The full GitLab repository URL"),
  path: z.string().describe("The file path within the repository"),
});

const GetRepoTreeSchema = z.object({
  repoUrl: z.string().url().describe("The full GitLab repository URL"),
});

const GetIssueDetailsSchema = z.object({
  projectPath: z.string().describe("The GitLab project path (e.g., gitlab-org/cli)"),
  issueIid: z.string().describe("The project-scoped issue IID"),
});

const VerifyPRSchema = z.object({
  prUrl: z.string().url().describe("The pull request (merge request) URL"),
});

// 2. Tool Registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fetch_gitlab_file",
        description: "Fetches a single file from a GitLab repository on demand.",
        inputSchema: zodToJsonSchema(FetchFileSchema as any) as any,
      },
      {
        name: "get_gitlab_repo_tree",
        description: "Fetches the repository tree (file paths) to prevent hallucinated paths.",
        inputSchema: zodToJsonSchema(GetRepoTreeSchema as any) as any,
      },
      {
        name: "get_gitlab_issue_details",
        description: "Fetches live issue details from GitLab using the project-scoped endpoint.",
        inputSchema: zodToJsonSchema(GetIssueDetailsSchema as any) as any,
      },
      {
        name: "verify_gitlab_pr",
        description: "Verifies if a pull request (merge request) exists.",
        inputSchema: zodToJsonSchema(VerifyPRSchema as any) as any,
      },
    ],
  };
});

// Helper for HTTP requests
async function makeGitLabRequest(url: string): Promise<Response> {
  const token = process.env.GITLAB_TOKEN || '';
  const headers: Record<string, string> = {};
  if (token && token !== 'your_gitlab_pat_here') {
    headers['PRIVATE-TOKEN'] = token;
  }
  return fetch(url, { headers });
}

// 3. Tool Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "fetch_gitlab_file": {
        const { repoUrl, path } = FetchFileSchema.parse(args);
        
        const cleanRepo = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl;
        const match = cleanRepo.match(/gitlab\.com\/(.+)$/);
        if (!match) {
          throw new Error(`Invalid GitLab URL format: ${repoUrl}`);
        }
        const projectPath = encodeURIComponent(match[1]);
        const encodedFilePath = encodeURIComponent(path);

        let url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedFilePath}/raw?ref=main`;
        let response = await makeGitLabRequest(url);

        if (response.status === 404) {
          url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedFilePath}/raw?ref=master`;
          response = await makeGitLabRequest(url);
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch file ${path} from ${cleanRepo}: ${response.statusText}`);
        }

        const text = await response.text();
        return {
          content: [{ type: "text", text }],
        };
      }

      case "get_gitlab_repo_tree": {
        const { repoUrl } = GetRepoTreeSchema.parse(args);
        
        const cleanRepo = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl;
        const match = cleanRepo.match(/gitlab\.com\/(.+)$/);
        if (!match) {
          throw new Error(`Invalid GitLab URL format: ${repoUrl}`);
        }
        const projectPath = encodeURIComponent(match[1]);

        let url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100&ref=main`;
        
        let allPaths: string[] = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage && page <= 10) {
          const pageUrl = `${url}&page=${page}`;
          let response = await makeGitLabRequest(pageUrl);
          
          if (response.status === 404) {
            url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100&ref=master`;
            response = await makeGitLabRequest(`${url}&page=${page}`);
          }
          
          if (!response.ok) {
            throw new Error(`Failed to fetch repository tree from ${cleanRepo}: ${response.statusText}`);
          }

          const data = await response.json();
          const blobs = data.filter((item: any) => item.type === 'blob').map((item: any) => item.path);
          allPaths = allPaths.concat(blobs);

          const linkHeader = response.headers.get('link');
          if (!linkHeader || !linkHeader.includes('rel="next"')) {
            hasNextPage = false;
          }
          page++;
        }

        return {
          content: [{ type: "text", text: JSON.stringify(allPaths) }],
        };
      }

      case "get_gitlab_issue_details": {
        const { projectPath, issueIid } = GetIssueDetailsSchema.parse(args);
        
        const encodedProjectPath = encodeURIComponent(projectPath);
        const url = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/issues/${issueIid}`;
        
        const response = await makeGitLabRequest(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch issue details. Status: ${response.status} ${response.statusText}`);
        }
        
        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
        const issueData = {
          id: data.id,
          iid: data.iid,
          title: data.title,
          state: data.state,
          assignee: data.assignee,
          web_url: data.web_url,
          description: data.description,
          labels: data.labels || []
        };

        return {
          content: [{ type: "text", text: JSON.stringify(issueData) }],
        };
      }

      case "verify_gitlab_pr": {
        const { prUrl } = VerifyPRSchema.parse(args);
        
        const isValid = prUrl.includes('merge_requests');
        return {
          content: [{ type: "text", text: JSON.stringify(isValid) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    // Note: Log exhaustively to stderr to avoid breaking Stdio JSON-RPC comms.
    console.error(`[GitlabMCPServer] Error executing tool:`, error);
    return {
      isError: true,
      content: [{ type: "text", text: error.message || String(error) }],
    };
  }
});

// 4. Initialize Transport & Connect
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitLab MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Failed to start GitLab MCP Server:", error);
  process.exit(1);
});
