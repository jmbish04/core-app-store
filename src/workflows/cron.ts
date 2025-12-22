/**
 * Cron Handler
 *
 * Handles scheduled cron triggers for refreshing inventory and health checks.
 */

import type { WorkerEnv } from '@core-app-store/shared';
import { refreshInventory } from './refresh-inventory';
import { updateHealthScores } from './health-checker';
import { generateLogInsights } from './log-insights';

export async function handleCron(cronSchedule: string, env: WorkerEnv): Promise<void> {
  console.log(`Cron triggered: ${cronSchedule}`);

  try {
    switch (cronSchedule) {
      case '*/15 * * * *': // Every 15 minutes - lightweight health refresh
        await updateHealthScores(env);
        break;

      case '0 * * * *': // Every hour - log insights & repo inference
        await generateLogInsights(env);
        break;

      case '0 2 * * *': // Daily at 2 AM - full inventory reconcile
        await refreshInventory(env, true);
        break;

      default:
        console.warn(`Unknown cron schedule: ${cronSchedule}`);
    }
  } catch (error) {
    console.error(`Cron error for ${cronSchedule}:`, error);
  }
}
