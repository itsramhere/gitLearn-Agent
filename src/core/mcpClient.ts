import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export class GitlabMCPClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    this.client = new Client(
      {
        name: "gitlab-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Spawn the GitlabMCPServer as a child process using ts-node
    // Note: use 'npx.cmd' on Windows to avoid spawning issues
    const isWin = process.platform === "win32";
    this.transport = new StdioClientTransport({
      command: isWin ? "npx.cmd" : "npx",
      args: ["ts-node", "-T", "src/mcps/GitlabMCPServer.ts"],
      env: process.env as any // Must pass env so the server inherits process.env.GITLAB_TOKEN
    });
  }

  /**
   * Initializes the client, connecting the transport. Must be called once before usage.
   */
  public async connect(): Promise<void> {
    await this.client.connect(this.transport);
    console.log("[GitlabMCPClient] Connected to GitLab MCP Server");
  }

  public async fetchFile(repoUrl: string, path: string): Promise<string> {
    const result = await this.client.callTool({
      name: "fetch_gitlab_file",
      arguments: { repoUrl, path }
    }) as any;
    
    if (result.isError) {
      throw new Error(`MCP Tool Error: ${result.content[0]?.text}`);
    }
    return result.content[0]?.text || "";
  }

  public async getRepoTree(repoUrl: string): Promise<string[]> {
    const result = await this.client.callTool({
      name: "get_gitlab_repo_tree",
      arguments: { repoUrl }
    }) as any;

    if (result.isError) {
      throw new Error(`MCP Tool Error: ${result.content[0]?.text}`);
    }
    return JSON.parse(result.content[0]?.text || "[]");
  }

  public async getIssueDetails(projectPath: string, issueIid: string): Promise<any> {
    const result = await this.client.callTool({
      name: "get_gitlab_issue_details",
      arguments: { projectPath, issueIid }
    }) as any;

    if (result.isError) {
      throw new Error(`MCP Tool Error: ${result.content[0]?.text}`);
    }
    return JSON.parse(result.content[0]?.text || "{}");
  }

  public async verifyPullRequest(prUrl: string): Promise<boolean> {
    const result = await this.client.callTool({
      name: "verify_gitlab_pr",
      arguments: { prUrl }
    }) as any;

    if (result.isError) {
      throw new Error(`MCP Tool Error: ${result.content[0]?.text}`);
    }
    return JSON.parse(result.content[0]?.text || "false");
  }
}
