import { z } from 'zod';

export const appTypeSchema = z.enum(['worker', 'pages']);

export const healthStatusSchema = z.enum(['working', 'broken', 'unknown']);

export const appCategorySchema = z.enum(['prod', 'tooling', 'personal', 'infra', 'experiments', 'other']);

export const appSchema = z.object({
  id: z.string(),
  type: appTypeSchema,
  cf_id: z.string(),
  name: z.string(),
  display_name: z.string().nullable(),
  account_id: z.string(),
  starred: z.boolean().default(false),
  category: appCategorySchema.nullable(),
  tags_json: z.string().nullable(),
  ai_summary: z.string().nullable(),
  deployed_url: z.string().nullable(),
  last_deployed_at: z.string().nullable(),
  last_log_at: z.string().nullable(),
  last_run_at: z.string().nullable(),
  last_seen_at: z.string().nullable(),
  health_status: healthStatusSchema,
  health_score: z.number().min(0).max(100),
  health_reasons_json: z.string().nullable(),
  repo_links_json: z.string().nullable(),
  repo_inference_evidence_json: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const appListItemSchema = appSchema.extend({
  tags: z.array(z.string()).optional(),
  health_reasons: z.array(z.string()).optional(),
  repo_links: z.array(z.object({
    repo_id: z.string(),
    full_name: z.string(),
    url: z.string(),
    link_type: z.enum(['manual', 'inferred']),
    confidence: z.number().optional(),
  })).optional(),
});

export const appDetailSchema = appListItemSchema;

export const starToggleRequestSchema = z.object({
  starred: z.boolean(),
});

export const linkRepoRequestSchema = z.object({
  repo_url: z.string().url(),
  link_type: z.enum(['manual', 'inferred']).default('manual'),
});

export type App = z.infer<typeof appSchema>;
export type AppListItem = z.infer<typeof appListItemSchema>;
export type AppDetail = z.infer<typeof appDetailSchema>;
export type StarToggleRequest = z.infer<typeof starToggleRequestSchema>;
export type LinkRepoRequest = z.infer<typeof linkRepoRequestSchema>;
