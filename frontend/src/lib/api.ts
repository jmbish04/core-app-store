import type {
  AppsListResponse,
  StarredAppsResponse,
  AppDetailResponse,
  DeploymentsResponse,
  LogInsightsResponse,
  MetaResponse,
  AppsQuery,
  CreateAppPlanRequest,
  CreateAppPlanResponse,
  CreateRepoRequest,
  CreateRepoResponse,
} from '@shared/schemas/api';

const API_BASE = '/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

export const api = {
  // Apps
  getApps: (query: Partial<AppsQuery>) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    return fetchAPI<AppsListResponse>(`/apps?${params.toString()}`);
  },

  getStarredApps: () => fetchAPI<StarredAppsResponse>('/apps/starred'),

  getApp: (id: string) => fetchAPI<AppDetailResponse>(`/apps/${id}`),

  toggleStar: (id: string, starred: boolean) =>
    fetchAPI<{ success: boolean }>(`/apps/${id}/star`, {
      method: 'POST',
      body: JSON.stringify({ starred }),
    }),

  refreshApp: (id: string) =>
    fetchAPI<{ success: boolean }>(`/apps/${id}/refresh`, { method: 'POST' }),

  getDeployments: (id: string, page = 1, perPage = 10) =>
    fetchAPI<DeploymentsResponse>(`/apps/${id}/deployments?page=${page}&per_page=${perPage}`),

  getLogInsights: (id: string) =>
    fetchAPI<LogInsightsResponse>(`/apps/${id}/logs/insights`),

  linkRepo: (id: string, repoUrl: string) =>
    fetchAPI<{ success: boolean }>(`/apps/${id}/repo/link`, {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl }),
    }),

  // Meta
  getMeta: () => fetchAPI<MetaResponse>('/meta'),

  refresh: () =>
    fetchAPI<{ job_id: string; status: string }>('/refresh', { method: 'POST' }),

  recordVisit: (appId: string, path: string) =>
    fetchAPI<{ success: boolean }>('/visit', {
      method: 'POST',
      body: JSON.stringify({ app_id: appId, path }),
    }),

  // Create new app
  generatePlan: (data: CreateAppPlanRequest) =>
    fetchAPI<CreateAppPlanResponse>('/new/plan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createRepo: (data: CreateRepoRequest) =>
    fetchAPI<CreateRepoResponse>('/new/create-repo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bootstrapRepo: (repoFullName: string, plan: any) =>
    fetchAPI<{ success: boolean; files_created: string[] }>('/new/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ repo_full_name: repoFullName, plan }),
    }),

  createCloudflareApp: (data: { name: string; type: 'worker' | 'pages'; repo_url?: string }) =>
    fetchAPI<{ app_id: string; cf_id: string; next_steps: string[] }>('/new/create-cloudflare', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
