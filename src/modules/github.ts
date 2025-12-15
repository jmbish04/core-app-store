/**
 * GitHub API Module
 *
 * Provides Octokit-based GitHub operations for repository creation,
 * file management, and metadata retrieval.
 */

import { Octokit } from '@octokit/rest';

interface GitHubConfig {
  token: string;
}

interface CreateRepoOptions {
  name: string;
  org?: string;
  private?: boolean;
  description?: string;
  auto_init?: boolean;
}

interface RepoInfo {
  id: number;
  full_name: string;
  url: string;
  clone_url: string;
  default_branch: string;
  visibility: string;
  created_at: string;
  description: string | null;
}

interface FileContent {
  path: string;
  content: string;
  message: string;
  branch?: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  /**
   * Create a new GitHub repository
   */
  async createRepo(options: CreateRepoOptions): Promise<RepoInfo> {
    try {
      const response = options.org
        ? await this.octokit.repos.createInOrg({
            org: options.org,
            name: options.name,
            private: options.private ?? true,
            description: options.description,
            auto_init: options.auto_init ?? false,
          })
        : await this.octokit.repos.createForAuthenticatedUser({
            name: options.name,
            private: options.private ?? true,
            description: options.description,
            auto_init: options.auto_init ?? false,
          });

      return {
        id: response.data.id,
        full_name: response.data.full_name,
        url: response.data.html_url,
        clone_url: response.data.clone_url,
        default_branch: response.data.default_branch || 'main',
        visibility: response.data.visibility || (response.data.private ? 'private' : 'public'),
        created_at: response.data.created_at,
        description: response.data.description,
      };
    } catch (error: any) {
      throw new Error(`Failed to create GitHub repo: ${error.message}`);
    }
  }

  /**
   * Create or update a file in a repository
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    fileContent: FileContent
  ): Promise<void> {
    try {
      // Check if file exists to get SHA for update
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner,
          repo,
          path: fileContent.path,
          ref: fileContent.branch,
        });
        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (error: any) {
        // File doesn't exist, will create new
        if (error.status !== 404) {
          throw error;
        }
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: fileContent.path,
        message: fileContent.message,
        content: btoa(fileContent.content),
        branch: fileContent.branch,
        sha,
      });
    } catch (error: any) {
      throw new Error(`Failed to create/update file ${fileContent.path}: ${error.message}`);
    }
  }

  /**
   * Create multiple files in a repository
   */
  async createFiles(
    owner: string,
    repo: string,
    files: FileContent[]
  ): Promise<void> {
    for (const file of files) {
      await this.createOrUpdateFile(owner, repo, file);
    }
  }

  /**
   * Get repository information
   */
  async getRepo(owner: string, repo: string): Promise<RepoInfo> {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return {
        id: data.id,
        full_name: data.full_name,
        url: data.html_url,
        clone_url: data.clone_url,
        default_branch: data.default_branch,
        visibility: data.visibility || (data.private ? 'private' : 'public'),
        created_at: data.created_at,
        description: data.description,
      };
    } catch (error: any) {
      throw new Error(`Failed to get repo info: ${error.message}`);
    }
  }

  /**
   * Get README content from a repository
   */
  async getReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.repos.getReadme({
        owner,
        repo,
      });

      if ('content' in data) {
        return atob(data.content);
      }
      return null;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(`Failed to get README: ${error.message}`);
    }
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,
      /github\.com\/([^\/]+)\/([^\/]+)\.git/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    return null;
  }

  /**
   * Extract GitHub URLs from text (logs, metadata, etc.)
   */
  static extractGitHubUrls(text: string): string[] {
    const pattern = /https?:\/\/github\.com\/[^\s<>"']+/g;
    const matches = text.match(pattern) || [];
    return [...new Set(matches)]; // De-duplicate
  }
}

/**
 * Mock GitHub Client for development/testing
 */
export class MockGitHubClient extends GitHubClient {
  constructor() {
    super({ token: 'mock-token' });
  }

  async createRepo(options: CreateRepoOptions): Promise<RepoInfo> {
    const fullName = options.org ? `${options.org}/${options.name}` : `user/${options.name}`;
    return {
      id: Math.floor(Math.random() * 1000000),
      full_name: fullName,
      url: `https://github.com/${fullName}`,
      clone_url: `https://github.com/${fullName}.git`,
      default_branch: 'main',
      visibility: options.private ? 'private' : 'public',
      created_at: new Date().toISOString(),
      description: options.description || null,
    };
  }

  async createOrUpdateFile(): Promise<void> {
    // Mock implementation - do nothing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async createFiles(): Promise<void> {
    // Mock implementation - do nothing
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async getRepo(owner: string, repo: string): Promise<RepoInfo> {
    return {
      id: Math.floor(Math.random() * 1000000),
      full_name: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
      clone_url: `https://github.com/${owner}/${repo}.git`,
      default_branch: 'main',
      visibility: 'private',
      created_at: new Date().toISOString(),
      description: 'Mock repository',
    };
  }

  async getReadme(): Promise<string | null> {
    return '# Mock Repository\n\nThis is a mock README file.';
  }
}
