import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';

// Placeholders for external services
import { generateWithGemini } from '../core/geminiClient';
import { GitlabMCPClient } from '../core/mcpClient';

export class CodeExplainerAgent {
  private fastify: FastifyInstance;
  private gitlabMcp: GitlabMCPClient;

  constructor(fastify: FastifyInstance, gitlabMcp: GitlabMCPClient) {
    this.fastify = fastify;
    this.gitlabMcp = gitlabMcp;
  }

  /**
   * Explains code to the student based on their profile, fetching only relevant files.
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
    const usersCollection = this.fastify.mongo.db.collection('users');

    // 1. Read existing concept map and history so we don't repeat explanations
    const userDoc = await usersCollection.findOne({ _id: new ObjectId(studentId) });
    if (!userDoc) throw new Error('Student not found in database');
    const existingConceptMap = userDoc.conceptMap || {
      filesExplained: [],
      conceptsUnderstood: [],
      conceptsConfused: []
    };

    // 2. Determine which files to fetch on demand (never the whole repo)
    // First, fetch the actual file tree from the repository to prevent hallucinations
    let repoTree: string[] = [];
    try {
      repoTree = await this.gitlabMcp.getRepoTree(repoUrl);
    } catch (err) {
      console.warn(`Could not fetch repo tree:`, err);
    }

    // We ask Gemini to identify which file paths likely contain the answer.
    const filePathsToFetchText = await generateWithGemini(
      `You will be given a repository file tree and a student question. Return ONLY a comma-separated list of file paths from the tree that are relevant to the question. Do not include any explanation, numbering, markdown formatting, bullet points, or any other text. Return file paths only, nothing else. Example of correct output: cmd/main.go,internal/api/client.go,docs/readme.md
       
       Student question: "${question}"
       
       Repository file tree:
       ${repoTree.length > 0 ? repoTree.join('\n') : "Unknown (tree fetch failed)"}`
    );
    const sanitizedText = filePathsToFetchText.replace(/[`'"]/g, '');
    const filePaths = sanitizedText.split(',').map(p => p.replace(/[*#\n\r]/g, '').trim()).filter(p => p.length > 0);

    console.log(`[Explainer Logs] Raw paths returned by Gemini:`, filePathsToFetchText);

    // 3. Fetch ONLY the relevant files from GitLab MCP
    const fetchedFiles: Record<string, string> = {};
    for (const path of filePaths) {
      const cleanRepo = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl;
      const match = cleanRepo.match(/gitlab\.com\/(.+)$/);
      let logUrl = `[Invalid Repo URL]`;
      if (match) {
        const projectPath = encodeURIComponent(match[1]);
        const encodedFilePath = encodeURIComponent(path);
        logUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedFilePath}/raw?ref=main`;
      }
      console.log(`[Explainer Logs] Fetching file from URL: ${logUrl}`);

      try {
        const content = await this.gitlabMcp.fetchFile(repoUrl, path);
        fetchedFiles[path] = content;
      } catch (err: any) {
        console.warn(`Could not fetch path "${path}" from GitLab. Error:`, err.message || err);
      }
    }
    
    console.log(`[Explainer Logs] Fetch summary: Attempted ${filePaths.length} paths, Successfully fetched ${Object.keys(fetchedFiles).length} paths.`);

    // 4. Adapt explanation style based on comfort level
    // Assuming inferredSkillLevel maps to 1-5 scale based on architecture doc (Section 4.3)
    let stylePrompt = "";
    const levelStr = profile.inferredSkillLevel?.toString().toLowerCase();
    
    if (levelStr.includes('beginner') || levelStr === '1' || levelStr === '2') {
      stylePrompt = "Use analogies, avoid jargon, and provide a line-by-line walkthrough.";
    } else if (levelStr.includes('intermediate') || levelStr === '3') {
      stylePrompt = "Focus on patterns, link to familiar concepts, and give a module-level view.";
    } else if (levelStr.includes('advanced') || levelStr === '4' || levelStr === '5') {
      stylePrompt = "Discuss architecture decisions, tradeoffs, edge cases, and design rationale.";
    } else {
      stylePrompt = "Provide a clear and concise explanation."; // Fallback
    }

    // 5. Generate the explanation ensuring we don't repeat known concepts
    const explanationPrompt = `
      You are the Code Explainer Agent.
      Student Question: ${question}
      
      Fetched Code Files:
      ${JSON.stringify(fetchedFiles)}
      
      Student's Existing Concept Map (DO NOT REPEAT concepts they already understand unless explicitly asked):
      - Files already explained: ${existingConceptMap.filesExplained?.join(', ')}
      - Concepts understood: ${existingConceptMap.conceptsUnderstood?.join(', ')}
      - Concepts confused about: ${existingConceptMap.conceptsConfused?.join(', ')}
      
      Explanation Style Instructions:
      ${stylePrompt}
      
      Provide the explanation directly to the student.
    `;
    const explanation = await generateWithGemini(explanationPrompt);

    // 6. Generate the updated concept map and session log based on this interaction
    const updatesPrompt = `
      Based on the student's message/question:
      "${question}"
      
      And the explanation you just provided:
      "${explanation}"
      
      And the files fetched for this explanation:
      ${JSON.stringify(Object.keys(fetchedFiles))}
      
      Update the student's concept map. The concept map tracks:
      1. "filesExplained": Array of file paths the student has now had explained to them.
      2. "conceptsUnderstood": Array of concepts the student confirmed they understood or can be assumed to understand.
      3. "conceptsConfused": Array of concepts the student explicitly stated they are confused about based on their message.

      Return a JSON object with these three arrays containing ONLY the newly added items from this interaction.
      Make sure it's valid JSON.
    `;
    const updatesJsonString = await generateWithGemini(updatesPrompt);
    const updates = JSON.parse(updatesJsonString.replace(/```json|```/g, ''));

    // Merge new concepts into the existing concept map
    const updatedConceptMap = {
      filesExplained: [...new Set([...(existingConceptMap.filesExplained || []), ...(updates.filesExplained || [])])],
      conceptsUnderstood: [...new Set([...(existingConceptMap.conceptsUnderstood || []), ...(updates.conceptsUnderstood || [])])],
      conceptsConfused: [...new Set([...(existingConceptMap.conceptsConfused || []), ...(updates.conceptsConfused || [])])]
    };

    // CRITICAL FIX: A concept cannot be both understood and confused. 
    // If it appears in confused, remove it from understood.
    updatedConceptMap.conceptsUnderstood = updatedConceptMap.conceptsUnderstood.filter(
      (concept: string) => !updatedConceptMap.conceptsConfused.includes(concept)
    );

    const sessionLogEntry = {
      timestamp: new Date(),
      question: question,
      filesFetched: Object.keys(fetchedFiles)
    };

    // 7. Write the session log and updated concept map back to MongoDB
    await usersCollection.updateOne(
      { _id: new ObjectId(studentId) },
      {
        $set: { conceptMap: updatedConceptMap },
        $push: { sessionHistory: sessionLogEntry } as any
      }
    );

    return {
      explanation,
      updatedConceptMap,
      sessionLogEntry
    };
  }
}
