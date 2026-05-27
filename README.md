# GitLearn Agent

GitLearn Agent is an intelligent, multi-agent AI assistant designed to help developers and students seamlessly onboard onto new open-source codebases. By analyzing a developer's unique skill level, domain focus, and learning goals, the agent provides tailored issue recommendations, real-time codebase explanations, and structured progress tracking. It acts as an interactive mentor that bridges the gap between learning a new repository and successfully contributing to it.

## Features

- **Personalized Issue Matching:** Recommends "Good First Issues" specifically tailored to the developer's experience level, known concepts, and learning goals.
- **Dynamic Concept Mapping:** Continuously monitors the user's questions and interactions to build a "Concept Map" of what they understand and where they are confused.
- **Contextual Codebase Explanations:** Deep dives into repository structure, file explanations, and complex code snippets using an intelligent multi-agent pipeline.
- **Issue Lifecycle Management:** Tracks the state of claimed issues, enforces time-to-live (TTL) countdowns, nudges students when they are stuck, and verifies successful pull requests.
- **Knowledge Sharing:** Prompts students for tips after successfully solving an issue to build a communal knowledge base for future contributors.
- **Rich Interactive UI:** A modern React-based dashboard featuring an interactive chat, sidebar progress tracking, slide-over issue boards, and a beautifully designed dark-mode aesthetic.

## Tech Stack

- **[Gemini](https://deepmind.google/technologies/gemini/):** Core LLM model powering the agents' reasoning, natural language understanding, and dynamic intent routing.
- **Google Cloud Agent Builder:** Framework utilized for orchestrating complex agentic workflows and tool execution.
- **GitLab MCP (Model Context Protocol):** Custom interface enabling secure, project-scoped API calls to GitLab for fetching issues, repository data, and verifying pull requests.
- **Elasticsearch:** Vector search engine used to quickly retrieve relevant repository files, past solutions, and matching open issues based on semantic embeddings.
- **MongoDB:** Primary database for persisting student profiles, concept maps, conversation histories, and issue claim states.
- **Fastify:** High-performance Node.js backend framework serving the RESTful API, authentication flow, and agent orchestration endpoints.
- **React:** Frontend library used to build the rich, interactive dashboard interface, styled with Tailwind CSS for modern web aesthetics.

## Architecture

The system is driven by an orchestration of five specialized AI agents, each responsible for a distinct aspect of the mentoring experience:

1. **OrchestratorAgent:** The central routing hub. It receives user messages, determines their intent using a specialized Gemini prompt, and delegates the task to the appropriate sub-agent (or handles general conversation directly).
2. **IssueMatcherAgent:** Responsible for analyzing the student's profile and Elasticsearch data to recommend a curated list of issues. It provides explicit reasoning on *why* an issue is a good fit.
3. **CodeExplainerAgent:** The domain expert. When a student is stuck or asks about a specific file/concept, this agent researches the repository, explains the code in an educational manner, and delegates updates to the Profiler.
4. **ProfilerAgent:** The passive observer. It analyzes the chat history and the Explainer's outputs to update the student's `Concept Map` (files explained, concepts understood, and concepts confused) in MongoDB.
5. **ProgressTrackerAgent:** The lifecycle manager. It handles issue claiming, TTL nudges, verifying if a submitted Pull Request URL is valid, and soliciting/storing advice from students upon successful issue resolution.

## Running Locally

Follow these steps to set up the project on your local machine.

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Elasticsearch cluster
- GitLab OAuth Application credentials
- Google Gemini API Key

### Environment Variable Setup
Create a `.env` file in the root directory (for the backend) and another in the `frontend/` directory (if required by Vite) with the following configuration:

**Root `.env` (Backend):**
```env
# Server
PORT=3000

# Databases
MONGODB_URI=mongodb://localhost:27017/gitlearn
ELASTIC_NODE=http://localhost:9200

# AI Models
GEMINI_API_KEY=your_gemini_api_key

# GitLab OAuth
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret
GITLAB_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Frontend `.env` (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3000
```

### Starting the Servers

1. **Install Dependencies:**
   Run `npm install` in the root directory, and then navigate to `frontend/` and run `npm install`.

2. **Start the Backend:**
   From the root directory, start the Fastify server:
   ```bash
   npx ts-node src/server.ts
   ```

3. **Start the Frontend:**
   Open a new terminal, navigate to the `frontend/` directory, and start the Vite development server:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the App:**
   Open your browser and navigate to `http://localhost:5173`. You will be prompted to log in via GitLab to begin.
