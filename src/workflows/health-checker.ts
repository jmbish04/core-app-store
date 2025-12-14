/**
 * Health Checker Workflow
 *
 * Updates health scores and status for all apps based on deployment timestamps,
 * log activity, and error rates.
 */

import type { WorkerEnv } from '@core-app-store/shared';
import { DatabaseService } from '../modules/database';

export async function updateHealthScores(env: WorkerEnv): Promise<void> {
  console.log('Starting health score update');

  try {
    const db = new DatabaseService(env.DB);

    // Get all apps
    const query = `SELECT * FROM apps`;
    const result = await env.DB.prepare(query).all();
    const apps = result.results;

    console.log(`Updating health for ${apps.length} apps`);

    for (const app of apps) {
      try {
        const health = await calculateAppHealth(app as any, env);
        await db.updateAppHealth(app.id as string, health);
      } catch (error) {
        console.error(`Error updating health for app ${app.id}:`, error);
      }
    }

    console.log('Health score update completed');
  } catch (error) {
    console.error('Health checker failed:', error);
  }
}

async function calculateAppHealth(app: any, env: WorkerEnv): Promise<{
  status: 'working' | 'broken' | 'unknown';
  score: number;
  reasons: string[];
}> {
  let score = 50; // Base score
  const reasons: string[] = [];
  const now = Date.now();

  // Check if app has a deployed URL
  if (app.deployed_url) {
    score += 10;
  } else {
    reasons.push('No deployed URL');
    score -= 10;
  }

  // Check last deployment time
  if (app.last_deployed_at) {
    const lastDeployedMs = new Date(app.last_deployed_at).getTime();
    const daysSinceDeployment = (now - lastDeployedMs) / (1000 * 60 * 60 * 24);

    if (daysSinceDeployment < 7) {
      score += 20;
      reasons.push('Recently deployed');
    } else if (daysSinceDeployment < 30) {
      score += 10;
    } else if (daysSinceDeployment > 90) {
      score -= 20;
      reasons.push('Not deployed in 90+ days');
    }
  } else {
    reasons.push('Never deployed');
    score -= 20;
  }

  // Check last log/run activity
  const lastActivity = app.last_log_at || app.last_run_at || app.last_seen_at;
  if (lastActivity) {
    const lastActivityMs = new Date(lastActivity).getTime();
    const hoursSinceActivity = (now - lastActivityMs) / (1000 * 60 * 60);

    if (hoursSinceActivity < 24) {
      score += 20;
      reasons.push('Active in last 24h');
    } else if (hoursSinceActivity < 168) {
      score += 10;
    } else if (hoursSinceActivity > 720) {
      // 30 days
      score -= 15;
      reasons.push('No activity in 30+ days');
    }
  }

  // Check for recent errors from log insights
  const insightQuery = `
    SELECT * FROM log_insights
    WHERE app_id = ?
    AND generated_at > datetime('now', '-24 hours')
  `;
  const insight = await env.DB.prepare(insightQuery).bind(app.id).first();

  if (insight) {
    try {
      const topErrors = JSON.parse(insight.top_errors_json as string || '[]');
      if (topErrors.length > 0) {
        const criticalErrors = topErrors.filter((e: any) => e.severity === 'critical' || e.severity === 'high');
        if (criticalErrors.length > 0) {
          score -= 30;
          reasons.push(`${criticalErrors.length} critical/high severity errors`);
        } else {
          score -= 10;
          reasons.push(`${topErrors.length} errors detected`);
        }
      }
    } catch (error) {
      console.error('Error parsing log insights:', error);
    }
  }

  // Check deployment status
  const deploymentQuery = `
    SELECT * FROM deployments
    WHERE app_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const lastDeployment = await env.DB.prepare(deploymentQuery).bind(app.id).first();

  if (lastDeployment) {
    if (lastDeployment.status === 'success') {
      score += 10;
    } else if (lastDeployment.status === 'failure' || lastDeployment.status === 'error') {
      score -= 20;
      reasons.push('Last deployment failed');
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine status based on score
  let status: 'working' | 'broken' | 'unknown';
  if (score >= 70) {
    status = 'working';
  } else if (score >= 40) {
    status = 'unknown';
  } else {
    status = 'broken';
  }

  return { status, score, reasons };
}
