import { z } from 'zod';
import { appListItemSchema, appDetailSchema } from './app';
import { deploymentListItemSchema } from './deployment';
import { logInsightDetailSchema } from './log';

// API Response schemas

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      per_page: z.number(),
      total: z.number(),
      total_pages: z.number(),
    }),
  });

export const appsListResponseSchema = paginatedResponseSchema(appListItemSchema);

export const starredAppsResponseSchema = z.object({
  starred: z.array(appListItemSchema),
  recently_active: z.array(appListItemSchema),
  broken_now: z.array(appListItemSchema),
});

export const appDetailResponseSchema = appDetailSchema;

export const deploymentsResponseSchema = paginatedResponseSchema(deploymentListItemSchema);

export const logInsightsResponseSchema = logInsightDetailSchema.nullable();

export const metaResponseSchema = z.object({
  total_apps: z.number(),
  total_workers: z.number(),
  total_pages: z.number(),
  health_distribution: z.object({
    working: z.number(),
    broken: z.number(),
    unknown: z.number(),
  }),
  last_refresh_at: z.string().nullable(),
  categories_distribution: z.record(z.number()),
});

export const refreshResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
});

export const createAppPlanRequestSchema = z.object({
  name: z.string(),
  type: z.enum(['worker', 'pages']),
  description: z.string(),
  conversation_history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

export const createAppPlanResponseSchema = z.object({
  plan: z.object({
    name: z.string(),
    type: z.enum(['worker', 'pages']),
    description: z.string(),
    modules: z.array(z.object({
      name: z.string(),
      purpose: z.string(),
      reuse_from: z.string().optional(),
    })),
    endpoints: z.array(z.object({
      path: z.string(),
      method: z.string(),
      purpose: z.string(),
    })).optional(),
    bindings: z.array(z.object({
      type: z.string(),
      name: z.string(),
      purpose: z.string(),
    })),
    d1_schema: z.string().optional(),
    crons: z.array(z.string()).optional(),
    workflows: z.array(z.string()).optional(),
  }),
  questions: z.array(z.string()).optional(),
  confidence: z.number(),
});

export const createRepoRequestSchema = z.object({
  name: z.string(),
  org: z.string().optional(),
  private: z.boolean().default(true),
  description: z.string().optional(),
});

export const createRepoResponseSchema = z.object({
  repo_id: z.string(),
  full_name: z.string(),
  url: z.string(),
  clone_url: z.string(),
});

export const bootstrapRequestSchema = z.object({
  repo_full_name: z.string(),
  plan: createAppPlanResponseSchema.shape.plan,
});

export const bootstrapResponseSchema = z.object({
  success: z.boolean(),
  files_created: z.array(z.string()),
  message: z.string(),
});

export const createCloudflareAppRequestSchema = z.object({
  name: z.string(),
  type: z.enum(['worker', 'pages']),
  repo_url: z.string().optional(),
});

export const createCloudflareAppResponseSchema = z.object({
  app_id: z.string(),
  cf_id: z.string(),
  type: z.enum(['worker', 'pages']),
  name: z.string(),
  deployed_url: z.string().nullable(),
  next_steps: z.array(z.string()),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

// Query parameter schemas

export const appsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['worker', 'pages']).optional(),
  category: z.enum(['prod', 'tooling', 'personal', 'infra', 'experiments', 'other']).optional(),
  health: z.enum(['working', 'broken', 'unknown']).optional(),
  starred: z.coerce.boolean().optional(),
  has_repo: z.coerce.boolean().optional(),
  sort_by: z.enum(['name', 'last_deployed', 'last_log', 'health_score', 'updated_at']).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const deploymentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(50).default(10),
});

// Type exports

export type AppsListResponse = z.infer<typeof appsListResponseSchema>;
export type StarredAppsResponse = z.infer<typeof starredAppsResponseSchema>;
export type AppDetailResponse = z.infer<typeof appDetailResponseSchema>;
export type DeploymentsResponse = z.infer<typeof deploymentsResponseSchema>;
export type LogInsightsResponse = z.infer<typeof logInsightsResponseSchema>;
export type MetaResponse = z.infer<typeof metaResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
export type CreateAppPlanRequest = z.infer<typeof createAppPlanRequestSchema>;
export type CreateAppPlanResponse = z.infer<typeof createAppPlanResponseSchema>;
export type CreateRepoRequest = z.infer<typeof createRepoRequestSchema>;
export type CreateRepoResponse = z.infer<typeof createRepoResponseSchema>;
export type BootstrapRequest = z.infer<typeof bootstrapRequestSchema>;
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
export type CreateCloudflareAppRequest = z.infer<typeof createCloudflareAppRequestSchema>;
export type CreateCloudflareAppResponse = z.infer<typeof createCloudflareAppResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type AppsQuery = z.infer<typeof appsQuerySchema>;
export type DeploymentsQuery = z.infer<typeof deploymentsQuerySchema>;
