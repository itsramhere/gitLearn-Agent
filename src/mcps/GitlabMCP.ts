export class GitlabMCP {
  private token: string;

  constructor() {
    this.token = process.env.GITLAB_TOKEN || '';
  }

  /**
   * Fetches a single file from a GitLab repository on demand.
   * Assumes the 'main' branch for simplicity.
   */
  public async fetchFile(repoUrl: string, path: string): Promise<string> {
    // Strip trailing slash if present
    const cleanRepo = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl;
    
    // Extract project path (e.g., 'gitlab-org/cli')
    const match = cleanRepo.match(/gitlab\.com\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GitLab URL format: ${repoUrl}`);
    }
    const projectPath = encodeURIComponent(match[1]);
    const encodedFilePath = encodeURIComponent(path);

    let url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedFilePath}/raw?ref=main`;
    
    const headers: Record<string, string> = {};
    if (this.token && this.token !== 'your_gitlab_pat_here') {
      headers['PRIVATE-TOKEN'] = this.token;
    }

    let response = await fetch(url, { headers });
    
    // Fallback to 'master' branch if 'main' returns a 404
    if (response.status === 404) {
      url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedFilePath}/raw?ref=master`;
      response = await fetch(url, { headers });
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file ${path} from ${cleanRepo}: ${response.statusText}`);
    }
    
    return await response.text();
  }

  /**
   * Fetches the repository tree (file paths) to prevent hallucinated paths.
   */
  public async getRepoTree(repoUrl: string): Promise<string[]> {
    const cleanRepo = repoUrl.endsWith('/') ? repoUrl.slice(0, -1) : repoUrl;
    const match = cleanRepo.match(/gitlab\.com\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GitLab URL format: ${repoUrl}`);
    }
    const projectPath = encodeURIComponent(match[1]);

    // Request up to 100 files recursively
    let url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100&ref=main`;
    
    const headers: Record<string, string> = {};
    if (this.token && this.token !== 'your_gitlab_pat_here') {
      headers['PRIVATE-TOKEN'] = this.token;
    }

    let allPaths: string[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= 10) {
      const pageUrl = `${url}&page=${page}`;
      let response = await fetch(pageUrl, { headers });
      
      // Fallback to 'master' branch if 'main' returns a 404
      if (response.status === 404) {
        url = `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100&ref=master`;
        response = await fetch(`${url}&page=${page}`, { headers });
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

    return allPaths;
  }

  /**
   * Fetches live issue details from GitLab using the project-scoped endpoint.
   * @param projectPath The GitLab project path, e.g. 'gitlab-org/cli'
   * @param issueIid The project-scoped issue IID (not the global ID)
   */
  public async getIssueDetails(projectPath: string, issueIid: string): Promise<any> {
    const encodedProjectPath = encodeURIComponent(projectPath);
    const url = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/issues/${issueIid}`;
    
    const headers: Record<string, string> = {};
    if (this.token && this.token !== 'your_gitlab_pat_here') {
      headers['PRIVATE-TOKEN'] = this.token;
    }

    console.log(`[GitlabMCP] Fetching issue details from: ${url}`);
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch issue details. Status: ${response.status} ${response.statusText}`);
    }
    const rawText = await response.text();
    console.log(`[GitlabMCP] Raw JSON response for issue ${issueIid}:`, rawText);
    
    const data = JSON.parse(rawText);
    return {
      id: data.id,
      iid: data.iid,
      title: data.title,
      state: data.state,
      assignee: data.assignee,
      web_url: data.web_url,
      description: data.description,
      labels: data.labels || []
    };
  }

  /**
   * Verifies if a pull request exists.
   * (Placeholder implementation to support the Progress Tracker test later).
   */
  public async verifyPullRequest(prUrl: string): Promise<boolean> {
    return prUrl.includes('merge_requests');
  }
}
