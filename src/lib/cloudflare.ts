import { Context } from 'hono';

export type CloudflareBindings = {
  DB: D1Database;
  KV: KVNamespace;
  AI: any;
  REFRESH_WORKFLOW: any;
  WORKER_API_KEY: string;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string; // Token with read access to Account/Workers/Pages
};

export class CloudflareClient {
  private accountId: string;
  private apiToken: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(accountId: string, apiToken: string) {
    this.accountId = accountId;
    this.apiToken = apiToken;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      console.error(`Cloudflare API Error: ${response.status} ${response.statusText} for ${url}`);
      try {
        const errorBody = await response.json();
        console.error('Error body:', JSON.stringify(errorBody));
      } catch (e) {
        // ignore
      }
      // Don't throw immediately, let caller handle or return null, but for this specific client helper,
      // we might want to standardize the response.
      // For now, return the raw response to allow caller to inspect.
    }
    return response;
  }

  async listWorkers() {
    const path = `/accounts/${this.accountId}/workers/scripts`;
    const res = await this.fetch(path);
    if (!res.ok) return [];
    const json: any = await res.json();
    return json.result || [];
  }

  async listPagesProjects() {
    const path = `/accounts/${this.accountId}/pages/projects`;
    const res = await this.fetch(path);
    if (!res.ok) return [];
    const json: any = await res.json();
    return json.result || [];
  }

  async listWorkerDeployments(scriptName: string) {
     const path = `/accounts/${this.accountId}/workers/scripts/${scriptName}/deployments`; // API path may vary, checking docs conceptually
     // Note: standard endpoint is /accounts/{account_id}/workers/scripts/{script_name}/deployments
     const res = await this.fetch(path);
     if (!res.ok) return [];
     const json: any = await res.json();
     return json.result || [];
  }

  async listPagesDeployments(projectName: string) {
    const path = `/accounts/${this.accountId}/pages/projects/${projectName}/deployments`;
    const res = await this.fetch(path);
    if (!res.ok) return [];
    const json: any = await res.json();
    return json.result || [];
  }

  // Create Worker
  async createWorker(name: string, scriptContent: string, bindings: any[] = []) {
      // Simplification: Uploading a worker often requires multipart form data if including metadata and script
      // For this "production-ready" demo, we'll assume a basic PUT/POST structure for the script
      // But typically this is complex. We will mock the success for the scope of this exercise if needed or do a best effort.

      // PUT /accounts/{account_id}/workers/scripts/{script_name}
      // Content-Type: application/javascript or multipart/form-data

      const path = `/accounts/${this.accountId}/workers/scripts/${name}`;
      // Basic single-file worker upload
      const res = await this.fetch(path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/javascript' },
          body: scriptContent
      });
      return res.ok;
  }
}
