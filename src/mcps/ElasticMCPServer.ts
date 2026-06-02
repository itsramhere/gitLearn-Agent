import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Client as ElasticClient } from "@elastic/elasticsearch";
import process from "process";

// -- Server Definition --

const server = new Server(
  {
    name: "elastic-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// -- Input Schemas --

const SemanticIssueSearchSchema = z.object({
  query: z.string().describe("The search query string to match against issue titles, descriptions, and labels"),
  domain: z.string().describe("The student's domain to bias results (e.g. Backend, Frontend)"),
});

// -- Tool Registration --

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "semantic_issue_search",
        description:
          "Searches the Elasticsearch issues index using a semantic match query. " +
          "Returns unsolved issues ranked by relevance to the query and domain.",
        inputSchema: zodToJsonSchema(SemanticIssueSearchSchema as any) as any,
      },
    ],
  };
});

// -- Elastic Client Factory --

function createElasticClient(): ElasticClient {
  const node = process.env.ELASTIC_NODE || "https://localhost:9200";
  const isLocal = node.includes("localhost") || node.includes("127.0.0.1");
  const options: any = { 
    node,
    ...(isLocal && { tls: { rejectUnauthorized: false } })
  };

  if (process.env.ELASTIC_API_KEY) {
    options.auth = { apiKey: process.env.ELASTIC_API_KEY };
  } else if (process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD) {
    options.auth = {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD,
    };
  }

  return new ElasticClient(options);
}

// -- Tool Execution Handler --

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "semantic_issue_search": {
        const { query, domain } = SemanticIssueSearchSchema.parse(args);

        console.error(`[ElasticMCPServer] Executing semantic_issue_search: query="${query}", domain="${domain}"`);

        const elastic = createElasticClient();

        const searchResponse = await elastic.search({
          index: "issues",
          size: 15,
          query: {
            bool: {
              must: [{ term: { status: "unsolved" } }],
              should: [
                { match: { labels: query } },
                { match: { description: query } },
                { match: { title: domain } },
              ],
            },
          },
        });

        const results = searchResponse.hits.hits.map((hit: any) => ({
          id: hit._id,
          iid: hit._source.iid,
          projectPath: hit._source.projectPath,
          title: hit._source.title,
          description: hit._source.description,
          labels: hit._source.labels,
          complexity: hit._source.complexity,
        }));

        console.error(`[ElasticMCPServer] Found ${results.length} candidate issues`);

        return {
          content: [{ type: "text", text: JSON.stringify(results) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error("[ElasticMCPServer] Error executing tool:", error);
    return {
      isError: true,
      content: [{ type: "text", text: error.message || String(error) }],
    };
  }
});

// -- Initialize Transport and Connect --

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Elastic MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Failed to start Elastic MCP Server:", error);
  process.exit(1);
});
