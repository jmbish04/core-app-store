import { Octokit } from '@octokit/rest';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async createRepo(name: string, privateRepo: boolean = true, description?: string) {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name,
        private: privateRepo,
        description,
        auto_init: true, // Initialize with README
      });
      return response.data;
    } catch (error) {
      console.error('GitHub Create Repo Error:', error);
      throw error;
    }
  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string) {
    try {
        // First get the SHA if file exists (to update) or to confirm it doesn't
        let sha: string | undefined;
        try {
            const { data } = await this.octokit.repos.getContent({
                owner,
                repo,
                path
            });
            if (data && !Array.isArray(data) && data.sha) {
                sha = data.sha;
            }
        } catch (e) {
            // File likely doesn't exist
        }

        const response = await this.octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: btoa(content), // Base64 encode
            sha
        });
        return response.data;
    } catch (error) {
        console.error('GitHub Create File Error:', error);
        throw error;
    }
  }

  async getRepo(owner: string, repo: string) {
      try {
          const { data } = await this.octokit.repos.get({ owner, repo });
          return data;
      } catch (error) {
          return null;
      }
  }
}
