import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MongoClient } from "mongodb";
import process from "process";

// -- Server Definition --

const server = new Server(
  {
    name: "mongo-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// -- Input Schemas --

const QueryHistoricalSolutionsSchema = z.object({
  topic: z.string().describe("The topic or concept to search historical solutions for"),
  issueComplexity: z.string().describe("The complexity level to filter by (e.g. beginner, intermediate, advanced)"),
});

// -- Tool Registration --

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_historical_solutions",
        description:
          "Queries the MongoDB solutions collection for past tips and solutions " +
          "matching a given topic and complexity level. Returns historical context " +
          "that can enrich code explanations.",
        inputSchema: zodToJsonSchema(QueryHistoricalSolutionsSchema as any) as any,
      },
    ],
  };
});

// -- Mongo Client Factory --

let cachedClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const uri = process.env.MONGO_URI || "";
  if (!uri) {
    throw new Error("MONGO_URI environment variable is not set");
  }

  console.error("[MongoMCPServer] Connecting to MongoDB...");
  const client = new MongoClient(uri);
  await client.connect();
  console.error("[MongoMCPServer] Connected to MongoDB successfully");

  cachedClient = client;
  return client;
}

// -- Tool Execution Handler --

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "query_historical_solutions": {
        const { topic, issueComplexity } = QueryHistoricalSolutionsSchema.parse(args);

        console.error(
          `[MongoMCPServer] Executing query_historical_solutions: topic="${topic}", complexity="${issueComplexity}"`
        );

        const client = await getMongoClient();
        const db = client.db();
        const solutionsCollection = db.collection("solutions");

        // Search for solutions that match the topic via regex and complexity level
        const results = await solutionsCollection
          .find({
            $or: [
              { topic: { $regex: topic, $options: "i" } },
              { tags: { $regex: topic, $options: "i" } },
              { tips: { $regex: topic, $options: "i" } },
            ],
            complexity: { $regex: issueComplexity, $options: "i" },
          })
          .limit(10)
          .toArray();

        console.error(`[MongoMCPServer] Found ${results.length} historical solutions`);

        // Sanitize results for transport (remove MongoDB _id objects)
        const sanitized = results.map((doc) => ({
          topic: doc.topic || "",
          tips: doc.tips || "",
          tags: doc.tags || [],
          complexity: doc.complexity || "",
          solvedBy: doc.solvedBy || "",
          solvedAt: doc.solvedAt || null,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(sanitized) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error("[MongoMCPServer] Error executing tool:", error);
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
  console.error("Mongo MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Failed to start Mongo MCP Server:", error);
  process.exit(1);
});
