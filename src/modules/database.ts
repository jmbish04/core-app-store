/**
 * Prisma Database Service Layer
 *
 * Handles all D1 database operations using Prisma ORM with type safety.
 * No raw SQL - all operations use Prisma Client.
 */

import { PrismaClient, type App, type Deployment } from '@prisma/client';
import { nanoid } from 'nanoid';
import type { AppListItem } from '@core-app-store/shared';
import { getPrismaClient } from './prisma';

export class PrismaDatabaseService {
  private prisma: PrismaClient;

  constructor(db: D1Database) {
    this.prisma = getPrismaClient(db);
  }

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
    const skip = (page - 1) * perPage;
    const sortBy = filters.sort_by || 'updatedAt';
    const sortOrder = filters.sort_order || 'desc';

    // Build where clause
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { displayName: { contains: filters.search } },
        { aiSummary: { contains: filters.search } },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.health) {
      where.healthStatus = filters.health;
    }

    if (filters.starred !== undefined) {
      where.starred = filters.starred;
    }

    if (filters.has_repo !== undefined) {
      if (filters.has_repo) {
        where.repoLinksJson = { not: null };
      } else {
        where.repoLinksJson = null;
      }
    }

    // Get total count
    const total = await this.prisma.app.count({ where });

    // Get apps with proper sorting
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const apps = await this.prisma.app.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
    });

    return {
      apps: apps.map(app => this.enrichApp(app)),
      total,
    };
  }

  async getStarredApps(): Promise<{
    starred: AppListItem[];
    recently_active: AppListItem[];
    broken_now: AppListItem[];
  }> {
    const [starred, recentlyActive, broken] = await Promise.all([
      this.prisma.app.findMany({
        where: { starred: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.app.findMany({
        orderBy: { lastLogAt: 'desc' },
        take: 10,
      }),
      this.prisma.app.findMany({
        where: { healthStatus: 'broken' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      starred: starred.map(app => this.enrichApp(app)),
      recently_active: recentlyActive.map(app => this.enrichApp(app)),
      broken_now: broken.map(app => this.enrichApp(app)),
    };
  }

  async getApp(id: string): Promise<AppListItem | null> {
    const app = await this.prisma.app.findUnique({
      where: { id },
    });

    return app ? this.enrichApp(app) : null;
  }

  async upsertApp(appData: any): Promise<any> {
    const id = appData.id || nanoid();
    const now = new Date().toISOString();

    const app = await this.prisma.app.upsert({
      where: { id },
      create: {
        id,
        type: appData.type,
        cfId: appData.cf_id || appData.cfId,
        name: appData.name,
        displayName: appData.display_name || appData.displayName,
        accountId: appData.account_id || appData.accountId || '',
        starred: appData.starred || false,
        category: appData.category,
        tagsJson: appData.tags_json || appData.tagsJson,
        aiSummary: appData.ai_summary || appData.aiSummary,
        deployedUrl: appData.deployed_url || appData.deployedUrl,
        lastDeployedAt: appData.last_deployed_at || appData.lastDeployedAt,
        lastLogAt: appData.last_log_at || appData.lastLogAt,
        lastRunAt: appData.last_run_at || appData.lastRunAt,
        lastSeenAt: appData.last_seen_at || appData.lastSeenAt,
        healthStatus: appData.health_status || appData.healthStatus || 'unknown',
        healthScore: appData.health_score || appData.healthScore || 0,
        healthReasonsJson: appData.health_reasons_json || appData.healthReasonsJson,
        repoLinksJson: appData.repo_links_json || appData.repoLinksJson,
        repoInferenceEvidenceJson: appData.repo_inference_evidence_json || appData.repoInferenceEvidenceJson,
        createdAt: appData.created_at || appData.createdAt || now,
        updatedAt: now,
      },
      update: {
        name: appData.name,
        displayName: appData.display_name || appData.displayName,
        deployedUrl: appData.deployed_url || appData.deployedUrl,
        lastDeployedAt: appData.last_deployed_at || appData.lastDeployedAt,
        lastLogAt: appData.last_log_at || appData.lastLogAt,
        lastRunAt: appData.last_run_at || appData.lastRunAt,
        healthStatus: appData.health_status || appData.healthStatus || 'unknown',
        healthScore: appData.health_score || appData.healthScore || 0,
        healthReasonsJson: appData.health_reasons_json || appData.healthReasonsJson,
        updatedAt: now,
      },
    });

    return app;
  }

  async updateAppStarred(id: string, starred: boolean): Promise<void> {
    await this.prisma.app.update({
      where: { id },
      data: { starred },
    });
  }

  async updateAppHealth(id: string, health: {
    status: string;
    score: number;
    reasons?: string[];
  }): Promise<void> {
    await this.prisma.app.update({
      where: { id },
      data: {
        healthStatus: health.status,
        healthScore: health.score,
        healthReasonsJson: health.reasons ? JSON.stringify(health.reasons) : null,
      },
    });
  }

  async updateAppAI(id: string, ai: {
    category?: string;
    tags?: string[];
    summary?: string;
  }): Promise<void> {
    const updateData: any = {};

    if (ai.category) {
      updateData.category = ai.category;
    }
    if (ai.tags) {
      updateData.tagsJson = JSON.stringify(ai.tags);
    }
    if (ai.summary) {
      updateData.aiSummary = ai.summary;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.app.update({
        where: { id },
        data: updateData,
      });
    }
  }

  // Deployments operations

  async getDeployments(appId: string, page: number = 1, perPage: number = 10): Promise<{ deployments: any[]; total: number }> {
    const skip = (page - 1) * perPage;

    const [deployments, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where: { appId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.deployment.count({ where: { appId } }),
    ]);

    return {
      deployments: deployments.map((d: Deployment) => ({
        ...d,
        app_id: d.appId,
        cf_deployment_id: d.cfDeploymentId,
        created_at: d.createdAt,
        metadata_json: d.metadataJson,
      })),
      total,
    };
  }

  async upsertDeployment(deployment: any): Promise<void> {
    const id = deployment.id || nanoid();
    const now = new Date().toISOString();

    await this.prisma.deployment.upsert({
      where: { cfDeploymentId: deployment.cf_deployment_id || deployment.cfDeploymentId },
      create: {
        id,
        appId: deployment.app_id || deployment.appId,
        cfDeploymentId: deployment.cf_deployment_id || deployment.cfDeploymentId,
        status: deployment.status || 'unknown',
        createdAt: deployment.created_at || deployment.createdAt || now,
        metadataJson: deployment.metadata_json || deployment.metadataJson,
      },
      update: {
        status: deployment.status,
        metadataJson: deployment.metadata_json || deployment.metadataJson,
      },
    });
  }

  // Log insights operations

  async getLogInsight(appId: string): Promise<any | null> {
    const insight = await this.prisma.logInsight.findUnique({
      where: { appId },
    });

    if (!insight) return null;

    return {
      app_id: insight.appId,
      generated_at: insight.generatedAt,
      summary: insight.summary,
      top_errors_json: insight.topErrorsJson,
      suggested_actions_json: insight.suggestedActionsJson,
      model_info_json: insight.modelInfoJson,
    };
  }

  async upsertLogInsight(insight: any): Promise<void> {
    const now = new Date().toISOString();

    await this.prisma.logInsight.upsert({
      where: { appId: insight.app_id || insight.appId },
      create: {
        appId: insight.app_id || insight.appId,
        generatedAt: insight.generated_at || insight.generatedAt || now,
        summary: insight.summary,
        topErrorsJson: insight.top_errors_json || insight.topErrorsJson,
        suggestedActionsJson: insight.suggested_actions_json || insight.suggestedActionsJson,
        modelInfoJson: insight.model_info_json || insight.modelInfoJson,
      },
      update: {
        generatedAt: insight.generated_at || insight.generatedAt || now,
        summary: insight.summary,
        topErrorsJson: insight.top_errors_json || insight.topErrorsJson,
        suggestedActionsJson: insight.suggested_actions_json || insight.suggestedActionsJson,
        modelInfoJson: insight.model_info_json || insight.modelInfoJson,
      },
    });
  }

  // Repo linking operations

  async linkRepo(appId: string, repoUrl: string, linkType: 'manual' | 'inferred' = 'manual'): Promise<void> {
    const fullName = this.extractRepoFullName(repoUrl);
    const now = new Date().toISOString();

    // Create or get repo
    const repo = await this.prisma.gitHubRepo.upsert({
      where: { fullName },
      create: {
        id: nanoid(),
        fullName,
        url: repoUrl,
        createdAt: now,
      },
      update: {},
    });

    // Create link
    await this.prisma.appRepoLink.upsert({
      where: {
        appId_repoId: {
          appId,
          repoId: repo.id,
        },
      },
      create: {
        appId,
        repoId: repo.id,
        linkType,
        confidence: linkType === 'manual' ? 1.0 : 0.8,
        createdAt: now,
      },
      update: {
        linkType,
        confidence: linkType === 'manual' ? 1.0 : 0.8,
      },
    });
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
    const [total, workers, pages, healthStats, categoryStats, lastRefresh] = await Promise.all([
      this.prisma.app.count(),
      this.prisma.app.count({ where: { type: 'worker' } }),
      this.prisma.app.count({ where: { type: 'pages' } }),
      this.prisma.app.groupBy({
        by: ['healthStatus'],
        _count: true,
      }),
      this.prisma.app.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: true,
      }),
      this.prisma.refreshJob.findFirst({
        where: { status: 'completed' },
        orderBy: { finishedAt: 'desc' },
      }),
    ]);

    const healthDistribution: Record<string, number> = {};
    healthStats.forEach((stat: { healthStatus: string; _count: number }) => {
      healthDistribution[stat.healthStatus] = stat._count;
    });

    const categoriesDistribution: Record<string, number> = {};
    categoryStats.forEach((stat: { category: string | null; _count: number }) => {
      if (stat.category) {
        categoriesDistribution[stat.category] = stat._count;
      }
    });

    return {
      total_apps: total,
      total_workers: workers,
      total_pages: pages,
      health_distribution: healthDistribution,
      last_refresh_at: lastRefresh?.finishedAt || null,
      categories_distribution: categoriesDistribution,
    };
  }

  async recordVisit(appId: string, path: string, userAgent?: string): Promise<void> {
    const now = new Date().toISOString();

    await this.prisma.appVisit.create({
      data: {
        id: nanoid(),
        appId,
        ts: now,
        userAgent,
        path,
      },
    });

    // Update last_seen_at
    await this.prisma.app.update({
      where: { id: appId },
      data: { lastSeenAt: now },
    });
  }

  // Helper methods

  private enrichApp(app: App): AppListItem {
    return {
      ...app,
      cf_id: app.cfId,
      display_name: app.displayName,
      account_id: app.accountId,
      tags_json: app.tagsJson,
      ai_summary: app.aiSummary,
      deployed_url: app.deployedUrl,
      last_deployed_at: app.lastDeployedAt,
      last_log_at: app.lastLogAt,
      last_run_at: app.lastRunAt,
      last_seen_at: app.lastSeenAt,
      health_status: app.healthStatus,
      health_score: app.healthScore,
      health_reasons_json: app.healthReasonsJson,
      repo_links_json: app.repoLinksJson,
      repo_inference_evidence_json: app.repoInferenceEvidenceJson,
      created_at: app.createdAt,
      updated_at: app.updatedAt,
      tags: app.tagsJson ? JSON.parse(app.tagsJson) : undefined,
      health_reasons: app.healthReasonsJson ? JSON.parse(app.healthReasonsJson) : undefined,
      repo_links: app.repoLinksJson ? JSON.parse(app.repoLinksJson) : undefined,
    };
  }

  private extractRepoFullName(url: string): string {
    const match = url.match(/github\.com\/([^\/]+\/[^\/\s#?]+)/);
    return match ? match[1] : url;
  }
}
