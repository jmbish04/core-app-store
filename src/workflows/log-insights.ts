/**
 * Log Insights Workflow
 *
 * Generates AI-powered insights from application logs.
 */

import type { WorkerEnv } from '@core-app-store/shared';
import { PrismaDatabaseService as DatabaseService } from '../modules/database';
import { AIService } from '../modules/ai-service';
import { getPrismaClient } from '../modules/prisma';

export async function generateLogInsights(env: WorkerEnv): Promise<void> {
  console.log('Starting log insights generation');

  try {
    const db = new DatabaseService(env.DB);
    const ai = new AIService(env.AI);

    // Get apps that have had recent activity or are broken
    const query = `
      SELECT * FROM apps
      WHERE health_status = 'broken'
         OR last_log_at > datetime('now', '-24 hours')
         OR last_deployed_at > datetime('now', '-24 hours')
      ORDER BY last_log_at DESC
      LIMIT 50
    `;
    const result = await env.DB.prepare(query).all();
    const apps = result.results;

    console.log(`Generating insights for ${apps.length} apps`);

    for (const app of apps) {
      try {
        // Get recent log events for this app
        const logsQuery = `
          SELECT * FROM log_events
          WHERE app_id = ?
          AND ts > datetime('now', '-24 hours')
          ORDER BY ts DESC
          LIMIT 100
        `;
        const logsResult = await env.DB.prepare(logsQuery).bind(app.id).all();

        if (logsResult.results.length === 0) {
          console.log(`No recent logs for app ${app.name}, skipping`);
          continue;
        }

        // Generate insights
        const insights = await ai.analyzeLogInsights({
          app_name: app.name as string,
          log_samples: logsResult.results.map((log: any) => ({
            ts: log.ts,
            level: log.level,
            message: log.message,
          })),
        });

        // Store insights
        await db.upsertLogInsight({
          app_id: app.id as string,
          summary: insights.summary,
          top_errors_json: JSON.stringify(insights.top_errors),
          suggested_actions_json: JSON.stringify(insights.suggested_actions),
          model_info_json: JSON.stringify({
            model: 'llama-3.1-8b-instruct',
            timestamp: new Date().toISOString(),
          }),
        });

        console.log(`Generated insights for app ${app.name}`);
      } catch (error) {
        console.error(`Error generating insights for app ${app.id}:`, error);
      }
    }

    console.log('Log insights generation completed');
  } catch (error) {
    console.error('Log insights workflow failed:', error);
  }
}
