/**
 * Cloudflare API Client Module
 *
 * Provides typed wrapper around Cloudflare API for Workers, Pages, Deployments, etc.
 * All live API calls should happen only inside workflows/refresh, not during UI GET requests.
 */

interface CloudflareAPIConfig {
  apiToken: string;
  accountId: string;
}

interface Worker {
  id: string;
  name: string;
  created_on: string;
  modified_on: string;
  script: string;
  routes?: WorkerRoute[];
  logpush?: boolean;
}

interface WorkerRoute {
  id: string;
  pattern: string;
  script: string;
}

interface PagesProject {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  source?: {
    type: string;
    config: {
      owner: string;
      repo_name: string;
      production_branch: string;
    };
  };
  created_on: string;
  production_deployment?: PagesDeployment;
  latest_deployment?: PagesDeployment;
}

interface PagesDeployment {
  id: string;
  short_id: string;
  project_id: string;
  project_name: string;
  environment: string;
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage: {
    name: string;
    status: string;
  };
  deployment_trigger: {
    type: string;
    metadata?: {
      branch?: string;
      commit_hash?: string;
      commit_message?: string;
    };
  };
}

interface WorkerDeployment {
  id: string;
  script_tag?: string;
  author_email?: string;
  created_on: string;
}

export class CloudflareAPIClient {
  private baseUrl = 'https://api.cloudflare.com/client/v4';
  private config: CloudflareAPIConfig;

  constructor(config: CloudflareAPIConfig) {
    this.config = config;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText} - ${error}`);
    }

    const data = await response.json() as { result: T; success: boolean; errors: any[] };

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return data.result;
  }

  // Workers API

  async listWorkers(): Promise<Worker[]> {
    return this.request<Worker[]>(`/accounts/${this.config.accountId}/workers/scripts`);
  }

  async getWorker(scriptName: string): Promise<Worker> {
    return this.request<Worker>(`/accounts/${this.config.accountId}/workers/scripts/${scriptName}`);
  }

  async listWorkerRoutes(): Promise<WorkerRoute[]> {
    return this.request<WorkerRoute[]>(`/accounts/${this.config.accountId}/workers/routes`);
  }

  async getWorkerSettings(scriptName: string): Promise<any> {
    return this.request(`/accounts/${this.config.accountId}/workers/scripts/${scriptName}/settings`);
  }

  // Pages API

  async listPagesProjects(): Promise<PagesProject[]> {
    return this.request<PagesProject[]>(`/accounts/${this.config.accountId}/pages/projects`);
  }

  async getPagesProject(projectName: string): Promise<PagesProject> {
    return this.request<PagesProject>(`/accounts/${this.config.accountId}/pages/projects/${projectName}`);
  }

  async listPagesDeployments(projectName: string): Promise<PagesDeployment[]> {
    return this.request<PagesDeployment[]>(`/accounts/${this.config.accountId}/pages/projects/${projectName}/deployments`);
  }

  // Analytics & Logs (best-effort, may not be available for all accounts)

  async getWorkerAnalytics(scriptName: string, since: string): Promise<any> {
    try {
      return this.request(`/accounts/${this.config.accountId}/workers/scripts/${scriptName}/analytics?since=${since}`);
    } catch (error) {
      console.warn(`Analytics not available for ${scriptName}:`, error);
      return null;
    }
  }

  async getWorkerLogs(scriptName: string, limit: number = 100): Promise<any[]> {
    try {
      // Note: This endpoint may require Logpush or Tail Workers
      // This is a placeholder for when logs are available
      return [];
    } catch (error) {
      console.warn(`Logs not available for ${scriptName}:`, error);
      return [];
    }
  }

  // Account settings

  async getAccountSettings(): Promise<any> {
    return this.request(`/accounts/${this.config.accountId}`);
  }
}

/**
 * Mock Cloudflare API Client for development/testing
 */
export class MockCloudflareAPIClient extends CloudflareAPIClient {
  constructor() {
    super({ apiToken: 'mock-token', accountId: 'mock-account' });
  }

  async listWorkers(): Promise<Worker[]> {
    return [
      {
        id: 'worker-1',
        name: 'api-gateway',
        created_on: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        modified_on: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        script: 'api-gateway',
        routes: [{ id: 'route-1', pattern: 'api.example.com/*', script: 'api-gateway' }],
      },
      {
        id: 'worker-2',
        name: 'image-resizer',
        created_on: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        modified_on: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        script: 'image-resizer',
      },
      {
        id: 'worker-3',
        name: 'auth-service',
        created_on: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        modified_on: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        script: 'auth-service',
      },
    ];
  }

  async listPagesProjects(): Promise<PagesProject[]> {
    return [
      {
        id: 'pages-1',
        name: 'marketing-site',
        subdomain: 'marketing-site',
        domains: ['marketing.example.com'],
        created_on: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        source: {
          type: 'github',
          config: {
            owner: 'acme-corp',
            repo_name: 'marketing-site',
            production_branch: 'main',
          },
        },
        production_deployment: {
          id: 'deploy-1',
          short_id: 'abc123',
          project_id: 'pages-1',
          project_name: 'marketing-site',
          environment: 'production',
          url: 'https://marketing-site.pages.dev',
          created_on: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          modified_on: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          latest_stage: { name: 'deploy', status: 'success' },
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'main',
              commit_hash: 'abc123def',
              commit_message: 'Update homepage',
            },
          },
        },
      },
      {
        id: 'pages-2',
        name: 'docs-site',
        subdomain: 'docs-site',
        domains: ['docs.example.com'],
        created_on: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  async getPagesProject(projectName: string): Promise<PagesProject> {
    const projects = await this.listPagesProjects();
    const project = projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }
    return project;
  }

  async listPagesDeployments(projectName: string): Promise<PagesDeployment[]> {
    return [
      {
        id: 'deploy-1',
        short_id: 'abc123',
        project_id: 'pages-1',
        project_name: projectName,
        environment: 'production',
        url: `https://${projectName}.pages.dev`,
        created_on: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        modified_on: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        latest_stage: { name: 'deploy', status: 'success' },
        deployment_trigger: {
          type: 'github:push',
          metadata: {
            branch: 'main',
            commit_hash: 'abc123def',
            commit_message: 'Update content',
          },
        },
      },
    ];
  }

  async getWorkerAnalytics(): Promise<any> {
    return {
      requests: Math.floor(Math.random() * 10000),
      errors: Math.floor(Math.random() * 100),
      duration_avg: Math.random() * 100,
    };
  }
}
