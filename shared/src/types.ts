// Core types used across frontend and backend

export type AppType = 'worker' | 'pages';

export type HealthStatus = 'working' | 'broken' | 'unknown';

export type AppCategory = 'prod' | 'tooling' | 'personal' | 'infra' | 'experiments' | 'other';

export type LinkType = 'manual' | 'inferred';

export interface CloudflareCredentials {
  apiToken: string;
  accountId: string;
}

export interface GitHubCredentials {
  token: string;
}

export interface WorkerEnv {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;
  WORKFLOWS: Service;
  ANALYTICS?: AnalyticsEngineDataset;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  GITHUB_TOKEN: string;
  WORKER_API_KEY: string;
  ENVIRONMENT: 'development' | 'production';
  DEV_MODE?: string;
  MOCK_CLOUDFLARE_API?: string;
}
