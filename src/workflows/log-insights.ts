/**
 * Log Insights Workflow
 *
 * Generates AI-powered insights from application logs.
 */

import type { WorkerEnv } from '@core-app-store/shared';
import { PrismaDatabaseService as DatabaseService } from '../modules/database';
import { AIService } from '../modules/ai-service';
import { getPrismaClient } from '../modules/prisma';
import type { LogEvent } from '@prisma/client';

export async function generateLogInsights(env: WorkerEnv): Promise<void> {
  console.log('Starting log insights generation');

  try {
    const db = new DatabaseService(env.DB);
    const ai = new AIService(env.AI);
    const prisma = getPrismaClient(env.DB);

    // Get apps that have had recent activity or are broken using Prisma
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const apps = await prisma.app.findMany({
      where: {
        OR: [
          { healthStatus: 'broken' },
          { lastLogAt: { gte: twentyFourHoursAgo } },
          { lastDeployedAt: { gte: twentyFourHoursAgo } },
        ],
      },
      orderBy: { lastLogAt: 'desc' },
      take: 50,
    });

    console.log(`Generating insights for ${apps.length} apps`);

    for (const app of apps) {
      try {
        // Get recent log events for this app using Prisma
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const logEvents = await prisma.logEvent.findMany({
          where: {
            appId: app.id,
            ts: { gte: twentyFourHoursAgo },
          },
          orderBy: { ts: 'desc' },
          take: 100,
        });

        if (logEvents.length === 0) {
          console.log(`No recent logs for app ${app.name}, skipping`);
          continue;
        }

        // Generate insights
        const insights = await ai.analyzeLogInsights({
          app_name: app.name,
          log_samples: logEvents.map((log: LogEvent) => ({
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
