# ---------------------------------------------------------------------------
# Dockerfile for GitLearn Agent Backend
# ---------------------------------------------------------------------------
# IMPORTANT ARCHITECTURAL NOTE:
#
# This backend is NOT a standard compiled Node.js server. It orchestrates
# multiple AI agents that communicate via the Model Context Protocol (MCP).
# MCP servers (GitlabMCPServer, ElasticMCPServer, MongoMCPServer) are spawned
# as child processes over stdio using `npx ts-node src/mcps/<Server>.ts`.
#
# Because the parent process dynamically spawns these children by referencing
# TypeScript source files in `src/`, we CANNOT compile to a `dist/` folder
# and discard the source. The `ts-node` runtime and the full `src/` directory
# must be preserved in the final image so that the stdio transport pipes
# resolve correctly at runtime.
#
# Similarly, devDependencies (ts-node, typescript, @types/*) are required at
# runtime -- not just at build time -- so we intentionally skip the
# `--production` flag during `npm install`.
# ---------------------------------------------------------------------------

FROM node:20-bullseye-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# ---------------------------------------------------------------------------
# Step 1: Install dependencies
# ---------------------------------------------------------------------------
# Copy package manifests first to leverage Docker layer caching.
# A change to application code will not invalidate the dependency layer.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies).
# devDependencies such as ts-node, typescript, and @types/* are needed at
# runtime because MCP child processes are executed directly from TypeScript
# source via `npx ts-node`.
RUN npm ci

# ---------------------------------------------------------------------------
# Step 2: Install ts-node and typescript globally
# ---------------------------------------------------------------------------
# The MCP client transport spawns child processes using `npx ts-node ...`.
# Installing these globally ensures the binaries are available on the system
# PATH regardless of how npx resolves the local node_modules/.bin directory.
RUN npm install -g typescript ts-node

# ---------------------------------------------------------------------------
# Step 3: Copy application source and configuration
# ---------------------------------------------------------------------------
# Copy tsconfig first (rarely changes, benefits from caching)
COPY tsconfig.json ./

# Copy the entire source directory. This MUST remain as-is (not compiled)
# because the StdioClientTransport in mcpClient.ts references paths like
# "src/mcps/GitlabMCPServer.ts" to spawn child processes.
COPY src/ ./src/

# Copy any additional configuration files that may be needed
COPY .env* ./

# ---------------------------------------------------------------------------
# Step 4: Expose the Fastify server port
# ---------------------------------------------------------------------------
EXPOSE 3000

# ---------------------------------------------------------------------------
# Step 5: Start the server
# ---------------------------------------------------------------------------
# Launch the main Fastify server using ts-node. This process will in turn
# spawn MCP server child processes (Gitlab, Elastic, Mongo) over stdio as
# needed by the agent orchestration layer.
CMD ["npx", "ts-node", "src/server.ts"]
