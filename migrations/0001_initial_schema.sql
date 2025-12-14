-- Initial schema for Core App Store
-- Created: 2024-12-14

-- Apps table: central registry of all Cloudflare Workers and Pages projects
CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('worker', 'pages')),
  cf_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  account_id TEXT NOT NULL,
  starred INTEGER NOT NULL DEFAULT 0,
  category TEXT CHECK(category IN ('prod', 'tooling', 'personal', 'infra', 'experiments', 'other')),
  tags_json TEXT,
  ai_summary TEXT,
  deployed_url TEXT,
  last_deployed_at TEXT,
  last_log_at TEXT,
  last_run_at TEXT,
  last_seen_at TEXT,
  health_status TEXT NOT NULL DEFAULT 'unknown' CHECK(health_status IN ('working', 'broken', 'unknown')),
  health_score INTEGER NOT NULL DEFAULT 0 CHECK(health_score >= 0 AND health_score <= 100),
  health_reasons_json TEXT,
  repo_links_json TEXT,
  repo_inference_evidence_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for fast queries
CREATE UNIQUE INDEX idx_apps_cf_id_type ON apps(cf_id, type);
CREATE INDEX idx_apps_type ON apps(type);
CREATE INDEX idx_apps_starred ON apps(starred) WHERE starred = 1;
CREATE INDEX idx_apps_health_status ON apps(health_status);
CREATE INDEX idx_apps_category ON apps(category);
CREATE INDEX idx_apps_updated_at ON apps(updated_at DESC);
CREATE INDEX idx_apps_last_deployed_at ON apps(last_deployed_at DESC);
CREATE INDEX idx_apps_last_log_at ON apps(last_log_at DESC);
CREATE INDEX idx_apps_health_score ON apps(health_score DESC);

-- Deployments table: track deployment history
CREATE TABLE deployments (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  cf_deployment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata_json TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployments_app_id ON deployments(app_id);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);
CREATE UNIQUE INDEX idx_deployments_cf_id ON deployments(cf_deployment_id);

-- Log events table: sampled/structured logs to control volume
CREATE TABLE log_events (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  fingerprint TEXT,
  meta_json TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX idx_log_events_app_id ON log_events(app_id);
CREATE INDEX idx_log_events_ts ON log_events(ts DESC);
CREATE INDEX idx_log_events_level ON log_events(level);
CREATE INDEX idx_log_events_fingerprint ON log_events(fingerprint);

-- Log insights table: AI-generated analysis of logs
CREATE TABLE log_insights (
  app_id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  summary TEXT NOT NULL,
  top_errors_json TEXT,
  suggested_actions_json TEXT,
  model_info_json TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX idx_log_insights_generated_at ON log_insights(generated_at DESC);

-- Refresh jobs table: track background sync operations
CREATE TABLE refresh_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  stats_json TEXT,
  error_json TEXT
);

CREATE INDEX idx_refresh_jobs_status ON refresh_jobs(status);
CREATE INDEX idx_refresh_jobs_started_at ON refresh_jobs(started_at DESC);

-- App visits table: track when users view apps (for "last visited")
CREATE TABLE app_visits (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  path TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE INDEX idx_app_visits_app_id ON app_visits(app_id);
CREATE INDEX idx_app_visits_ts ON app_visits(ts DESC);

-- GitHub repos table: track linked repositories
CREATE TABLE github_repos (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  default_branch TEXT,
  visibility TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  meta_json TEXT
);

CREATE INDEX idx_github_repos_full_name ON github_repos(full_name);

-- App-repo links table: many-to-many relationship between apps and repos
CREATE TABLE app_repo_links (
  app_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK(link_type IN ('manual', 'inferred')),
  confidence REAL,
  evidence_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (app_id, repo_id),
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  FOREIGN KEY (repo_id) REFERENCES github_repos(id) ON DELETE CASCADE
);

CREATE INDEX idx_app_repo_links_app_id ON app_repo_links(app_id);
CREATE INDEX idx_app_repo_links_repo_id ON app_repo_links(repo_id);
CREATE INDEX idx_app_repo_links_link_type ON app_repo_links(link_type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_apps_timestamp
AFTER UPDATE ON apps
FOR EACH ROW
BEGIN
  UPDATE apps SET updated_at = datetime('now') WHERE id = NEW.id;
END;
