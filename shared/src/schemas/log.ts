import { z } from 'zod';

export const logEventSchema = z.object({
  id: z.string(),
  app_id: z.string(),
  ts: z.string(),
  level: z.string(),
  message: z.string(),
  fingerprint: z.string().nullable(),
  meta_json: z.string().nullable(),
});

export const logInsightSchema = z.object({
  app_id: z.string(),
  generated_at: z.string(),
  summary: z.string(),
  top_errors_json: z.string(),
  suggested_actions_json: z.string(),
  model_info_json: z.string(),
});

export const logInsightDetailSchema = logInsightSchema.extend({
  top_errors: z.array(z.object({
    error: z.string(),
    count: z.number(),
    severity: z.string(),
    first_seen: z.string().optional(),
    last_seen: z.string().optional(),
  })).optional(),
  suggested_actions: z.array(z.string()).optional(),
  model_info: z.object({
    model: z.string(),
    timestamp: z.string(),
    confidence: z.number().optional(),
  }).optional(),
});

export type LogEvent = z.infer<typeof logEventSchema>;
export type LogInsight = z.infer<typeof logInsightSchema>;
export type LogInsightDetail = z.infer<typeof logInsightDetailSchema>;
