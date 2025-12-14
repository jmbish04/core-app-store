/**
 * Database Service Layer
 *
 * Handles all D1 database operations with type safety and proper error handling.
 */

import { nanoid } from 'nanoid';
import type { App, AppListItem, Deployment, LogEvent, LogInsight } from '@core-app-store/shared';

export class DatabaseService {
  constructor(private db: D1Database) {}

  // Apps operations

  async getApps(filters: {
    page?: number;
    per_page?: number;
    search?: string;
    type?: string;
    category?: string;
    health?: string;
    starred?: boolean;
    has_repo?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<{ apps: AppListItem[]; total: number }> {
    const page = filters.page || 1;
    const perPage = filters.per_page || 20;
    const offset = (page - 1) * perPage;
    const sortBy = filters.sort_by || 'updated_at';
    const sortOrder = filters.sort_order || 'desc';

    let whereClause: string[] = [];
    let params: any[] = [];

    if (filters.search) {
      whereClause.push('(name LIKE ? OR display_name LIKE ? OR ai_summary LIKE ?)');
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.type) {
      whereClause.push('type = ?');
      params.push(filters.type);
    }

    if (filters.category) {
      whereClause.push('category = ?');
      params.push(filters.category);
    }

    if (filters.health) {
      whereClause.push('health_status = ?');
      params.push(filters.health);
    }

    if (filters.starred !== undefined) {
      whereClause.push('starred = ?');
      params.push(filters.starred ? 1 : 0);
    }

    if (filters.has_repo !== undefined) {
      if (filters.has_repo) {
        whereClause.push('repo_links_json IS NOT NULL');
      } else {
        whereClause.push('repo_links_json IS NULL');
      }
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM apps ${where}`;
    const countResult = await this.db.prepare(countQuery).bind(...params).first<{ count: number }>();
    const total = countResult?.count || 0;

    // Get apps
    const appsQuery = `
      SELECT * FROM apps
      ${where}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;
    const appsResult = await this.db.prepare(appsQuery).bind(...params, perPage, offset).all<App>();

    const apps = appsResult.results.map(app => this.enrichApp(app));

    return { apps, total };
  }

  async getStarredApps(): Promise<{
    starred: AppListItem[];
    recently_active: AppListItem[];
    broken_now: AppListItem[];
  }> {
    const starredQuery = `
      SELECT * FROM apps
      WHERE starred = 1
      ORDER BY updated_at DESC
      LIMIT 20
    `;
    const starred = await this.db.prepare(starredQuery).all<App>();

    const recentlyActiveQuery = `
      SELECT * FROM apps
      ORDER BY COALESCE(last_log_at, last_deployed_at, last_run_at, updated_at) DESC
      LIMIT 10
    `;
    const recentlyActive = await this.db.prepare(recentlyActiveQuery).all<App>();

    const brokenQuery = `
      SELECT * FROM apps
      WHERE health_status = 'broken'
      ORDER BY updated_at DESC
      LIMIT 5
    `;
    const broken = await this.db.prepare(brokenQuery).all<App>();

    return {
      starred: starred.results.map(app => this.enrichApp(app)),
      recently_active: recentlyActive.results.map(app => this.enrichApp(app)),
      broken_now: broken.results.map(app => this.enrichApp(app)),
    };
  }

  async getApp(id: string): Promise<AppListItem | null> {
    const query = `SELECT * FROM apps WHERE id = ?`;
    const result = await this.db.prepare(query).bind(id).first<App>();
    return result ? this.enrichApp(result) : null;
  }

  async upsertApp(app: Partial<App> & { cf_id: string; type: string; name: string }): Promise<App> {
    const id = app.id || nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO apps (
        id, type, cf_id, name, display_name, account_id,
        starred, category, tags_json, ai_summary,
        deployed_url, last_deployed_at, last_log_at, last_run_at, last_seen_at,
        health_status, health_score, health_reasons_json,
        repo_links_json, repo_inference_evidence_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        display_name = excluded.display_name,
        deployed_url = excluded.deployed_url,
        last_deployed_at = excluded.last_deployed_at,
        last_log_at = excluded.last_log_at,
        last_run_at = excluded.last_run_at,
        health_status = excluded.health_status,
        health_score = excluded.health_score,
        health_reasons_json = excluded.health_reasons_json,
        updated_at = excluded.updated_at
    `;

    await this.db.prepare(query).bind(
      id,
      app.type,
      app.cf_id,
      app.name,
      app.display_name || null,
      app.account_id || '',
      app.starred ? 1 : 0,
      app.category || null,
      app.tags_json || null,
      app.ai_summary || null,
      app.deployed_url || null,
      app.last_deployed_at || null,
      app.last_log_at || null,
      app.last_run_at || null,
      app.last_seen_at || null,
      app.health_status || 'unknown',
      app.health_score || 0,
      app.health_reasons_json || null,
      app.repo_links_json || null,
      app.repo_inference_evidence_json || null,
      app.created_at || now,
      now
    ).run();

    const result = await this.getApp(id);
    return result as App;
  }

  async updateAppStarred(id: string, starred: boolean): Promise<void> {
    const query = `UPDATE apps SET starred = ? WHERE id = ?`;
    await this.db.prepare(query).bind(starred ? 1 : 0, id).run();
  }

  async updateAppHealth(id: string, health: {
    status: string;
    score: number;
    reasons?: string[];
  }): Promise<void> {
    const query = `
      UPDATE apps
      SET health_status = ?, health_score = ?, health_reasons_json = ?
      WHERE id = ?
    `;
    await this.db.prepare(query).bind(
      health.status,
      health.score,
      health.reasons ? JSON.stringify(health.reasons) : null,
      id
    ).run();
  }

  async updateAppAI(id: string, ai: {
    category?: string;
    tags?: string[];
    summary?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];

    if (ai.category) {
      updates.push('category = ?');
      params.push(ai.category);
    }
    if (ai.tags) {
      updates.push('tags_json = ?');
      params.push(JSON.stringify(ai.tags));
    }
    if (ai.summary) {
      updates.push('ai_summary = ?');
      params.push(ai.summary);
    }

    if (updates.length === 0) return;

    const query = `UPDATE apps SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);
    await this.db.prepare(query).bind(...params).run();
  }

  // Deployments operations

  async getDeployments(appId: string, page: number = 1, perPage: number = 10): Promise<{ deployments: Deployment[]; total: number }> {
    const offset = (page - 1) * perPage;

    const countQuery = `SELECT COUNT(*) as count FROM deployments WHERE app_id = ?`;
    const countResult = await this.db.prepare(countQuery).bind(appId).first<{ count: number }>();
    const total = countResult?.count || 0;

    const query = `
      SELECT * FROM deployments
      WHERE app_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const result = await this.db.prepare(query).bind(appId, perPage, offset).all<Deployment>();

    return { deployments: result.results, total };
  }

  async upsertDeployment(deployment: Partial<Deployment> & { app_id: string; cf_deployment_id: string }): Promise<void> {
    const id = deployment.id || nanoid();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO deployments (id, app_id, cf_deployment_id, status, created_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(cf_deployment_id) DO UPDATE SET
        status = excluded.status,
        metadata_json = excluded.metadata_json
    `;

    await this.db.prepare(query).bind(
      id,
      deployment.app_id,
      deployment.cf_deployment_id,
      deployment.status || 'unknown',
      deployment.created_at || now,
      deployment.metadata_json || null
    ).run();
  }

  // Log insights operations

  async getLogInsight(appId: string): Promise<LogInsight | null> {
    const query = `SELECT * FROM log_insights WHERE app_id = ? ORDER BY generated_at DESC LIMIT 1`;
    const result = await this.db.prepare(query).bind(appId).first<LogInsight>();
    return result;
  }

  async upsertLogInsight(insight: Omit<LogInsight, 'generated_at'> & { generated_at?: string }): Promise<void> {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO log_insights (app_id, generated_at, summary, top_errors_json, suggested_actions_json, model_info_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(app_id) DO UPDATE SET
        generated_at = excluded.generated_at,
        summary = excluded.summary,
        top_errors_json = excluded.top_errors_json,
        suggested_actions_json = excluded.suggested_actions_json,
        model_info_json = excluded.model_info_json
    `;

    await this.db.prepare(query).bind(
      insight.app_id,
      insight.generated_at || now,
      insight.summary,
      insight.top_errors_json,
      insight.suggested_actions_json,
      insight.model_info_json
    ).run();
  }

  // Repo linking operations

  async linkRepo(appId: string, repoUrl: string, linkType: 'manual' | 'inferred' = 'manual'): Promise<void> {
    // First, get or create the repo record
    const repoId = nanoid();
    const repoQuery = `
      INSERT INTO github_repos (id, full_name, url, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(full_name) DO NOTHING
    `;

    const fullName = this.extractRepoFullName(repoUrl);
    await this.db.prepare(repoQuery).bind(repoId, fullName, repoUrl, new Date().toISOString()).run();

    // Get the repo ID
    const getRepoQuery = `SELECT id FROM github_repos WHERE full_name = ?`;
    const repo = await this.db.prepare(getRepoQuery).bind(fullName).first<{ id: string }>();

    if (!repo) return;

    // Link app to repo
    const linkQuery = `
      INSERT INTO app_repo_links (app_id, repo_id, link_type, confidence, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(app_id, repo_id) DO UPDATE SET
        link_type = excluded.link_type,
        confidence = excluded.confidence
    `;

    await this.db.prepare(linkQuery).bind(
      appId,
      repo.id,
      linkType,
      linkType === 'manual' ? 1.0 : 0.8,
      new Date().toISOString()
    ).run();
  }

  // Metadata operations

  async getMeta(): Promise<{
    total_apps: number;
    total_workers: number;
    total_pages: number;
    health_distribution: Record<string, number>;
    last_refresh_at: string | null;
    categories_distribution: Record<string, number>;
  }> {
    const totalQuery = `SELECT COUNT(*) as count FROM apps`;
    const total = await this.db.prepare(totalQuery).first<{ count: number }>();

    const workersQuery = `SELECT COUNT(*) as count FROM apps WHERE type = 'worker'`;
    const workers = await this.db.prepare(workersQuery).first<{ count: number }>();

    const pagesQuery = `SELECT COUNT(*) as count FROM apps WHERE type = 'pages'`;
    const pages = await this.db.prepare(pagesQuery).first<{ count: number }>();

    const healthQuery = `
      SELECT health_status, COUNT(*) as count
      FROM apps
      GROUP BY health_status
    `;
    const healthResults = await this.db.prepare(healthQuery).all<{ health_status: string; count: number }>();
    const healthDistribution = healthResults.results.reduce((acc, row) => {
      acc[row.health_status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM apps
      WHERE category IS NOT NULL
      GROUP BY category
    `;
    const categoryResults = await this.db.prepare(categoryQuery).all<{ category: string; count: number }>();
    const categoriesDistribution = categoryResults.results.reduce((acc, row) => {
      acc[row.category] = row.count;
      return acc;
    }, {} as Record<string, number>);

    const lastRefreshQuery = `
      SELECT finished_at FROM refresh_jobs
      WHERE status = 'completed'
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    const lastRefresh = await this.db.prepare(lastRefreshQuery).first<{ finished_at: string }>();

    return {
      total_apps: total?.count || 0,
      total_workers: workers?.count || 0,
      total_pages: pages?.count || 0,
      health_distribution: healthDistribution,
      last_refresh_at: lastRefresh?.finished_at || null,
      categories_distribution: categoriesDistribution,
    };
  }

  async recordVisit(appId: string, path: string, userAgent?: string): Promise<void> {
    const query = `
      INSERT INTO app_visits (id, app_id, ts, user_agent, path)
      VALUES (?, ?, ?, ?, ?)
    `;
    await this.db.prepare(query).bind(
      nanoid(),
      appId,
      new Date().toISOString(),
      userAgent || null,
      path
    ).run();

    // Update last_seen_at
    const updateQuery = `UPDATE apps SET last_seen_at = ? WHERE id = ?`;
    await this.db.prepare(updateQuery).bind(new Date().toISOString(), appId).run();
  }

  // Helper methods

  private enrichApp(app: App): AppListItem {
    return {
      ...app,
      tags: app.tags_json ? JSON.parse(app.tags_json) : undefined,
      health_reasons: app.health_reasons_json ? JSON.parse(app.health_reasons_json) : undefined,
      repo_links: app.repo_links_json ? JSON.parse(app.repo_links_json) : undefined,
    };
  }

  private extractRepoFullName(url: string): string {
    const match = url.match(/github\.com\/([^\/]+\/[^\/\.]+)/);
    return match ? match[1] : url;
  }
}
