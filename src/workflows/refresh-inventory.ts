/**
 * Refresh Inventory Workflow
 *
 * Pulls Cloudflare Workers and Pages projects, updates D1 database.
 */

import { nanoid } from 'nanoid';
import type { WorkerEnv } from '@core-app-store/shared';
import { CloudflareAPIClient, MockCloudflareAPIClient } from '../modules/cloudflare-api';
import { DatabaseService } from '../modules/database';
import { AIService } from '../modules/ai-service';

export async function refreshInventory(env: WorkerEnv, fullReconcile: boolean = false): Promise<void> {
  const jobId = nanoid();
  const startTime = new Date().toISOString();

  console.log(`Starting inventory refresh job ${jobId}, full reconcile: ${fullReconcile}`);

  try {
    // Update job status to running
    await env.DB.prepare(`
      INSERT INTO refresh_jobs (id, status, started_at)
      VALUES (?, 'running', ?)
      ON CONFLICT(id) DO UPDATE SET status = 'running'
    `).bind(jobId, startTime).run();

    const useMock = env.MOCK_CLOUDFLARE_API === 'true';
    const cfClient = useMock
      ? new MockCloudflareAPIClient()
      : new CloudflareAPIClient({
          apiToken: env.CLOUDFLARE_API_TOKEN,
          accountId: env.CLOUDFLARE_ACCOUNT_ID,
        });

    const db = new DatabaseService(env.DB);
    const ai = new AIService(env.AI);

    let stats = {
      workers_processed: 0,
      pages_processed: 0,
      deployments_synced: 0,
      ai_categorized: 0,
      errors: [] as string[],
    };

    // Fetch Workers
    try {
      const workers = await cfClient.listWorkers();
      console.log(`Found ${workers.length} workers`);

      for (const worker of workers) {
        try {
          const lastDeployedAt = worker.modified_on;
          const deployedUrl = worker.routes && worker.routes.length > 0
            ? `https://${worker.routes[0].pattern}`
            : null;

          // Upsert app
          const app = await db.upsertApp({
            type: 'worker',
            cf_id: worker.id,
            name: worker.name,
            account_id: env.CLOUDFLARE_ACCOUNT_ID,
            deployed_url: deployedUrl,
            last_deployed_at: lastDeployedAt,
            health_status: 'unknown',
            health_score: 0,
          });

          // AI categorization (only for new apps or if full reconcile)
          if (fullReconcile || !app.category) {
            try {
              const categorization = await ai.categorizeApp({
                name: worker.name,
                deployed_url: deployedUrl || undefined,
              });

              await db.updateAppAI(app.id, {
                category: categorization.category,
                tags: categorization.tags,
                summary: categorization.summary,
              });

              stats.ai_categorized++;
            } catch (error) {
              console.error(`AI categorization failed for ${worker.name}:`, error);
            }
          }

          stats.workers_processed++;
        } catch (error: any) {
          console.error(`Error processing worker ${worker.name}:`, error);
          stats.errors.push(`Worker ${worker.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error fetching workers:', error);
      stats.errors.push(`Fetch workers: ${error.message}`);
    }

    // Fetch Pages projects
    try {
      const projects = await cfClient.listPagesProjects();
      console.log(`Found ${projects.length} Pages projects`);

      for (const project of projects) {
        try {
          const lastDeployedAt = project.production_deployment?.created_on || project.created_on;
          const deployedUrl = project.production_deployment?.url ||
            `https://${project.subdomain}.pages.dev`;

          // Upsert app
          const app = await db.upsertApp({
            type: 'pages',
            cf_id: project.id,
            name: project.name,
            account_id: env.CLOUDFLARE_ACCOUNT_ID,
            deployed_url: deployedUrl,
            last_deployed_at: lastDeployedAt,
            health_status: 'unknown',
            health_score: 0,
          });

          // If repo source exists, link it
          if (project.source?.config) {
            const repoUrl = `https://github.com/${project.source.config.owner}/${project.source.config.repo_name}`;
            await db.linkRepo(app.id, repoUrl, 'inferred');
          }

          // Sync deployments
          try {
            const deployments = await cfClient.listPagesDeployments(project.name);
            for (const deployment of deployments.slice(0, 10)) {
              await db.upsertDeployment({
                app_id: app.id,
                cf_deployment_id: deployment.id,
                status: deployment.latest_stage.status,
                created_at: deployment.created_on,
                metadata_json: JSON.stringify({
                  environment: deployment.environment,
                  url: deployment.url,
                  commit_hash: deployment.deployment_trigger.metadata?.commit_hash,
                  commit_message: deployment.deployment_trigger.metadata?.commit_message,
                }),
              });
              stats.deployments_synced++;
            }
          } catch (error) {
            console.error(`Error syncing deployments for ${project.name}:`, error);
          }

          // AI categorization
          if (fullReconcile || !app.category) {
            try {
              const categorization = await ai.categorizeApp({
                name: project.name,
                deployed_url: deployedUrl,
              });

              await db.updateAppAI(app.id, {
                category: categorization.category,
                tags: categorization.tags,
                summary: categorization.summary,
              });

              stats.ai_categorized++;
            } catch (error) {
              console.error(`AI categorization failed for ${project.name}:`, error);
            }
          }

          stats.pages_processed++;
        } catch (error: any) {
          console.error(`Error processing Pages project ${project.name}:`, error);
          stats.errors.push(`Pages ${project.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error fetching Pages projects:', error);
      stats.errors.push(`Fetch Pages: ${error.message}`);
    }

    // Update job status to completed
    await env.DB.prepare(`
      UPDATE refresh_jobs
      SET status = 'completed', finished_at = ?, stats_json = ?
      WHERE id = ?
    `).bind(
      new Date().toISOString(),
      JSON.stringify(stats),
      jobId
    ).run();

    console.log(`Inventory refresh completed. Stats:`, stats);
  } catch (error: any) {
    console.error(`Inventory refresh failed:`, error);

    // Update job status to failed
    await env.DB.prepare(`
      UPDATE refresh_jobs
      SET status = 'failed', finished_at = ?, error_json = ?
      WHERE id = ?
    `).bind(
      new Date().toISOString(),
      JSON.stringify({ message: error.message, stack: error.stack }),
      jobId
    ).run();
  }
}
