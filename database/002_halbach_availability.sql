-- Blocked calendar days synced from Plumlee
CREATE TABLE IF NOT EXISTS halbach_availability (
  blocked_date DATE PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS halbach_availability_blocked_date_idx ON halbach_availability (blocked_date);

-- Sync run history (last successful run drives "Last updated" UI)
CREATE TABLE IF NOT EXISTS halbach_availability_sync (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  blocked_count INTEGER,
  error_message TEXT,
  source_url TEXT
);
