import { ObjectId } from 'mongodb';

// External services
import { generateWithGemini } from '../core/geminiClient';
import { GitlabMCPClient, MongoMCPClient } from '../core/mcpClient';
import { UserRepository } from '../repositories/UserRepository';

export class CodeExplainerAgent {
  private userRepository: UserRepository;
  private gitlabMcp: GitlabMCPClient;
  private mongoMcp: MongoMCPClient;
  private mcpConnected: boolean = false;
  private mongoMcpConnected: boolean = false;

  constructor(userRepository: UserRepository, gitlabMcp: GitlabMCPClient, mongoMcp: MongoMCPClient) {
    this.userRepository = userRepository;
    this.gitlabMcp = gitlabMcp;
    this.mongoMcp = mongoMcp;
  }

  /**
   * Orchestrates the agentic loop to explain code to the student based on their profile.
   *
   * @param studentId The MongoDB ObjectId string of the student
   * @param profile The student's profile (including inferredSkillLevel)
   * @param repoUrl The URL of the GitLab repository
   * @param question The student's question about the codebase
   */
  public async explainCode(
    studentId: string,
    profile: any,
    repoUrl: string,
    question: string
  ) {
    // Step 0: Ensure MCP connections
    await this.ensureMcpConnected();
    await this.ensureMongoMcpConnected();

    // Step 1: Context Discovery (Student Profile and Concept Map)
    const { existingConceptMap } = await this.userRepository.getStudentProfile(studentId);

    // Step 2: Context Discovery (Fetch Repo Tree)
    const repoTree = await this.fetchRepositoryTree(repoUrl);

    // Step 3: File Selection via LLM
    const filePaths = await this.selectFilesWithLLM(question, repoTree);
    if (filePaths.length === 0) {
      return {
        explanation: "I couldn't identify any specific files in the repository that are relevant to your question. Could you clarify or point me to a specific module?",
        updatedConceptMap: existingConceptMap,
        sessionLogEntry: { timestamp: new Date(), question, filesFetched: [] }
      };
    }

    // Step 4: Code Retrieval (with fast-fail error handling)
    const fetchedFiles = await this.fetchSourceCode(repoUrl, filePaths);
    if (Object.keys(fetchedFiles).length === 0) {
      return {
        explanation: `I tried to look up the relevant files (like \`${filePaths[0]}\`) but couldn't find them in the current branch of the repository. They might have been moved or renamed.`,
        updatedConceptMap: existingConceptMap,
        sessionLogEntry: { timestamp: new Date(), question, filesFetched: [] }
      };
    }

    // Step 4.5: Fetch historical tips from Mongo MCP to enrich the explanation
    const historicalTips = await this.fetchHistoricalTips(question, profile);

    // Step 5: Explanation Generation and Concept Map Update (Combined LLM Call)
    const { explanation, mapUpdates } = await this.generateExplanationAndUpdateMap(
      question, fetchedFiles, profile, existingConceptMap, historicalTips
    );

    const updatedConceptMap = {
      filesExplained: [...new Set([...(existingConceptMap.filesExplained || []), ...Object.keys(fetchedFiles)])],
      conceptsUnderstood: [...new Set([...(existingConceptMap.conceptsUnderstood || []), ...(mapUpdates.conceptsUnderstood || [])])],
      conceptsConfused: [...new Set([...(existingConceptMap.conceptsConfused || []), ...(mapUpdates.conceptsConfused || [])])]
    };

    // Prevent a concept from being simultaneously understood and confused
    updatedConceptMap.conceptsUnderstood = updatedConceptMap.conceptsUnderstood.filter(
      (concept: string) => !updatedConceptMap.conceptsConfused.includes(concept)
    );

    const sessionLogEntry = {
      timestamp: new Date(),
      question: question,
      filesFetched: Object.keys(fetchedFiles)
    };

    // Step 6: Save Interaction
    await this.userRepository.saveInteraction(studentId, updatedConceptMap, sessionLogEntry);

    return {
      explanation,
      updatedConceptMap,
      sessionLogEntry
    };
  }

  /**
   * Initializes the GitLab MCP connection exactly once.
   */
  private async ensureMcpConnected(): Promise<void> {
    if (!this.mcpConnected) {
      try {
        await this.gitlabMcp.connect();
        this.mcpConnected = true;
      } catch (err: any) {
        console.error('[CodeExplainerAgent] Failed to connect to GitLab MCP Server:', err);
        throw new Error('Internal Error: Could not connect to GitLab MCP Server.');
      }
    }
  }

  /**
   * Initializes the Mongo MCP connection exactly once.
   */
  private async ensureMongoMcpConnected(): Promise<void> {
    if (!this.mongoMcpConnected) {
      try {
        await this.mongoMcp.connect();
        this.mongoMcpConnected = true;
      } catch (err: any) {
        console.error('[CodeExplainerAgent] Failed to connect to Mongo MCP Server:', err);
        throw new Error('Internal Error: Could not connect to Mongo MCP Server.');
      }
    }
  }

  /**
   * Step 2: Fetches the full repository tree from GitLab via MCP.
   */
  private async fetchRepositoryTree(repoUrl: string): Promise<string[]> {
    try {
      return await this.gitlabMcp.getRepoTree(repoUrl);
    } catch (err: any) {
      console.error(`[CodeExplainerAgent] Error fetching repo tree for ${repoUrl}:`, err);
      return [];
    }
  }

  /**
   * Step 3: Asks Gemini to identify relevant files from the repo tree based on the student's question.
   */
  private async selectFilesWithLLM(question: string, repoTree: string[]): Promise<string[]> {
    const prompt = `You will be given a repository file tree and a student question. Return ONLY a comma-separated list of file paths from the tree that are relevant to the question. Do not include any explanation, numbering, markdown formatting, bullet points, or any other text. Return file paths only, nothing else. Example of correct output: cmd/main.go,internal/api/client.go,docs/readme.md
       
       Student question: "${question}"
       
       Repository file tree:
       ${repoTree.length > 0 ? repoTree.join('\n') : "Unknown (tree fetch failed)"}`;

    const filePathsToFetchText = await generateWithGemini(prompt);
    console.log(`[CodeExplainerAgent] Raw paths returned by Gemini:`, filePathsToFetchText);

    const sanitizedText = filePathsToFetchText.replace(/[`'"]/g, '');
    const filePaths = sanitizedText.split(',').map(p => p.replace(/[*#\n\r]/g, '').trim()).filter(p => p.length > 0);
    return filePaths;
  }

  /**
   * Step 4: Fetches the raw source code of the identified files from GitLab via MCP.
   */
  private async fetchSourceCode(repoUrl: string, filePaths: string[]): Promise<Record<string, string>> {
    const fetchedFiles: Record<string, string> = {};

    for (const path of filePaths) {
      try {
        console.log(`[CodeExplainerAgent] Fetching file: ${path} from ${repoUrl}`);
        const content = await this.gitlabMcp.fetchFile(repoUrl, path);
        fetchedFiles[path] = content;
      } catch (err: any) {
        console.error(`[CodeExplainerAgent] Failed to fetch path "${path}" from GitLab. Error:`, err.message || err);
      }
    }

    console.log(`[CodeExplainerAgent] Fetch summary: Attempted ${filePaths.length} paths, Successfully fetched ${Object.keys(fetchedFiles).length} paths.`);
    return fetchedFiles;
  }

  /**
   * Step 4.5: Fetches historical tips from the Mongo MCP to enrich the explanation context.
   */
  private async fetchHistoricalTips(question: string, profile: any): Promise<any[]> {
    try {
      const complexity = profile.inferredSkillLevel?.toString().toLowerCase() || "intermediate";
      // Extract key topic words from the question for the search
      const topic = question.split(' ').slice(0, 5).join(' ');
      const tips = await this.mongoMcp.getHistoricalSolutions(topic, complexity);
      console.log(`[CodeExplainerAgent] Fetched ${tips.length} historical tips from Mongo MCP`);
      return tips;
    } catch (err: any) {
      console.error('[CodeExplainerAgent] Failed to fetch historical tips:', err.message || err);
      return [];
    }
  }

  /**
   * Step 5: Generates the explanation and identifies concept map updates in a single LLM call.
   * Injects historical tips into the context if available.
   */
  private async generateExplanationAndUpdateMap(
    question: string,
    fetchedFiles: Record<string, string>,
    profile: any,
    existingConceptMap: any,
    historicalTips: any[]
  ): Promise<{ explanation: string, mapUpdates: { conceptsUnderstood: string[], conceptsConfused: string[] } }> {
    let stylePrompt = "";
    const levelStr = profile.inferredSkillLevel?.toString().toLowerCase() || "";

    if (levelStr.includes('beginner') || levelStr === '1' || levelStr === '2') {
      stylePrompt = "Use analogies, avoid jargon, and provide a line-by-line walkthrough.";
    } else if (levelStr.includes('intermediate') || levelStr === '3') {
      stylePrompt = "Focus on patterns, link to familiar concepts, and give a module-level view.";
    } else if (levelStr.includes('advanced') || levelStr === '4' || levelStr === '5') {
      stylePrompt = "Discuss architecture decisions, tradeoffs, edge cases, and design rationale.";
    } else {
      stylePrompt = "Provide a clear and concise explanation.";
    }

    // Build historical tips section for the prompt
    let historicalTipsSection = "";
    if (historicalTips.length > 0) {
      historicalTipsSection = `
      Historical Tips from Past Students (use these to enrich your explanation where relevant):
      ${JSON.stringify(historicalTips)}
      `;
    }

    const explanationPrompt = `
      You are the Code Explainer Agent.
      Student Question: ${question}
      
      Fetched Code Files:
      ${JSON.stringify(fetchedFiles)}
      
      Student's Existing Concept Map (DO NOT REPEAT concepts they already understand unless explicitly asked):
      - Files already explained: ${existingConceptMap.filesExplained?.join(', ')}
      - Concepts understood: ${existingConceptMap.conceptsUnderstood?.join(', ')}
      - Concepts confused about: ${existingConceptMap.conceptsConfused?.join(', ')}
      ${historicalTipsSection}
      Explanation Style Instructions:
      ${stylePrompt}
      
      TASK: 
      Provide the explanation directly to the student based on the code.
      Additionally, based on their question and your explanation, identify any NEW concepts they likely understand now or are explicitly confused about.
      
      OUTPUT FORMAT:
      You MUST return a single raw JSON object matching this schema exactly. Do not wrap it in markdown block quotes (e.g. \`\`\`json). Just the raw JSON object.
      {
        "explanation": "Your markdown explanation goes here",
        "mapUpdates": {
          "conceptsUnderstood": ["new concept 1", "new concept 2"],
          "conceptsConfused": ["confused concept 1"]
        }
      }
    `;

    const responseText = await generateWithGemini(explanationPrompt);

    try {
      const sanitized = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      const result = JSON.parse(sanitized);

      if (!result.explanation || !result.mapUpdates) {
        throw new Error("Missing required keys in LLM JSON output");
      }

      return {
        explanation: result.explanation,
        mapUpdates: {
          conceptsUnderstood: result.mapUpdates.conceptsUnderstood || [],
          conceptsConfused: result.mapUpdates.conceptsConfused || []
        }
      };
    } catch (err: any) {
      console.error("[CodeExplainerAgent] Failed to parse combined LLM response:", err, "\nResponse Text:", responseText);

      // Fallback: Return raw text as explanation and empty updates
      return {
        explanation: responseText,
        mapUpdates: {
          conceptsUnderstood: [],
          conceptsConfused: []
        }
      };
    }
  }
}
