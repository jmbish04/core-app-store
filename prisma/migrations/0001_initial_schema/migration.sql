-- CreateTable
CREATE TABLE IF NOT EXISTS "apps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "cf_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "account_id" TEXT NOT NULL,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "tags_json" TEXT,
    "ai_summary" TEXT,
    "deployed_url" TEXT,
    "last_deployed_at" TEXT,
    "last_log_at" TEXT,
    "last_run_at" TEXT,
    "last_seen_at" TEXT,
    "health_status" TEXT NOT NULL DEFAULT 'unknown',
    "health_score" INTEGER NOT NULL DEFAULT 0,
    "health_reasons_json" TEXT,
    "repo_links_json" TEXT,
    "repo_inference_evidence_json" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "deployments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "app_id" TEXT NOT NULL,
    "cf_deployment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata_json" TEXT,
    CONSTRAINT "deployments_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "log_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "app_id" TEXT NOT NULL,
    "ts" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fingerprint" TEXT,
    "meta_json" TEXT,
    CONSTRAINT "log_events_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "log_insights" (
    "app_id" TEXT NOT NULL PRIMARY KEY,
    "generated_at" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "top_errors_json" TEXT NOT NULL,
    "suggested_actions_json" TEXT NOT NULL,
    "model_info_json" TEXT NOT NULL,
    CONSTRAINT "log_insights_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "refresh_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "started_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TEXT,
    "stats_json" TEXT,
    "error_json" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "app_visits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "app_id" TEXT NOT NULL,
    "ts" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "path" TEXT,
    CONSTRAINT "app_visits_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "github_repos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "default_branch" TEXT,
    "visibility" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta_json" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "app_repo_links" (
    "app_id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "confidence" REAL,
    "evidence_json" TEXT,
    "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("app_id", "repo_id"),
    CONSTRAINT "app_repo_links_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "app_repo_links_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idx_apps_cf_id_type" ON "apps"("cf_id", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_type" ON "apps"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_starred" ON "apps"("starred");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_health_status" ON "apps"("health_status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_category" ON "apps"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_updated_at" ON "apps"("updated_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_last_deployed_at" ON "apps"("last_deployed_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_last_log_at" ON "apps"("last_log_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_apps_health_score" ON "apps"("health_score");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "deployments_cf_deployment_id_key" ON "deployments"("cf_deployment_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_deployments_app_id" ON "deployments"("app_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_deployments_created_at" ON "deployments"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_log_events_app_id" ON "log_events"("app_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_log_events_ts" ON "log_events"("ts");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_log_events_level" ON "log_events"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_log_events_fingerprint" ON "log_events"("fingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_log_insights_generated_at" ON "log_insights"("generated_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_refresh_jobs_status" ON "refresh_jobs"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_refresh_jobs_started_at" ON "refresh_jobs"("started_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_app_visits_app_id" ON "app_visits"("app_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_app_visits_ts" ON "app_visits"("ts");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "github_repos_full_name_key" ON "github_repos"("full_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_github_repos_full_name" ON "github_repos"("full_name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_app_repo_links_app_id" ON "app_repo_links"("app_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_app_repo_links_repo_id" ON "app_repo_links"("repo_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_app_repo_links_link_type" ON "app_repo_links"("link_type");
