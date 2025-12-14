-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'worker' or 'pages'
  cf_id TEXT, -- Cloudflare ID (worker name or pages project name)
  name TEXT NOT NULL,
  display_name TEXT,
  account_id TEXT,
  starred BOOLEAN DEFAULT FALSE,
  category TEXT,
  tags_json TEXT, -- JSON array of strings
  ai_summary TEXT,
  deployed_url TEXT,
  last_deployed_at TEXT, -- ISO8601 string
  last_log_at TEXT,
  last_run_at TEXT,
  last_seen_at TEXT,
  health_status TEXT, -- 'working', 'broken', 'unknown'
  health_score INTEGER, -- 0-100
  health_reasons_json TEXT, -- JSON array
  repo_links_json TEXT, -- JSON
  repo_inference_evidence_json TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_cf_id_type ON apps(cf_id, type);
CREATE INDEX IF NOT EXISTS idx_apps_updated_at ON apps(updated_at);
CREATE INDEX IF NOT EXISTS idx_apps_health_score ON apps(health_score);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  cf_deployment_id TEXT,
  status TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  metadata_json TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE INDEX IF NOT EXISTS idx_deployments_app_id ON deployments(app_id);

-- Log Events (sampled)
CREATE TABLE IF NOT EXISTS log_events (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  ts TEXT,
  level TEXT,
  message TEXT,
  fingerprint TEXT,
  meta_json TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE INDEX IF NOT EXISTS idx_log_events_app_id ON log_events(app_id);

-- Log Insights
CREATE TABLE IF NOT EXISTS log_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL,
  generated_at TEXT DEFAULT (datetime('now')),
  summary TEXT,
  top_errors_json TEXT,
  suggested_actions_json TEXT,
  model_info_json TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE INDEX IF NOT EXISTS idx_log_insights_app_id ON log_insights(app_id);

-- Refresh Jobs
CREATE TABLE IF NOT EXISTS refresh_jobs (
  id TEXT PRIMARY KEY,
  status TEXT, -- 'pending', 'running', 'success', 'failed'
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  stats_json TEXT,
  error_json TEXT
);

-- App Visits (telemetry)
CREATE TABLE IF NOT EXISTS app_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL,
  ts TEXT DEFAULT (datetime('now')),
  user_agent TEXT,
  path TEXT,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE INDEX IF NOT EXISTS idx_app_visits_app_id ON app_visits(app_id);

-- GitHub Repos
CREATE TABLE IF NOT EXISTS github_repos (
  id TEXT PRIMARY KEY, -- GitHub Repo ID or Full Name
  full_name TEXT NOT NULL,
  url TEXT,
  default_branch TEXT,
  visibility TEXT,
  created_at TEXT,
  meta_json TEXT
);

-- App Repo Links
CREATE TABLE IF NOT EXISTS app_repo_links (
  app_id TEXT NOT NULL,
  repo_id TEXT NOT NULL,
  link_type TEXT, -- 'manual' or 'inferred'
  confidence REAL,
  evidence_json TEXT,
  PRIMARY KEY (app_id, repo_id),
  FOREIGN KEY (app_id) REFERENCES apps(id),
  FOREIGN KEY (repo_id) REFERENCES github_repos(id)
);
