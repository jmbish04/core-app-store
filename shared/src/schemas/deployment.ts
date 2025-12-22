import { z } from 'zod';

export const deploymentSchema = z.object({
  id: z.string(),
  app_id: z.string(),
  cf_deployment_id: z.string(),
  status: z.string(),
  created_at: z.string(),
  metadata_json: z.string().nullable(),
});

export const deploymentListItemSchema = deploymentSchema.extend({
  metadata: z.record(z.any()).optional(),
});

export type Deployment = z.infer<typeof deploymentSchema>;
export type DeploymentListItem = z.infer<typeof deploymentListItemSchema>;
