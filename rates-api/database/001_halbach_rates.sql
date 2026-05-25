-- Halbach nightly rates (Phase 1)
CREATE TABLE IF NOT EXISTS halbach_rates (
  rate_date DATE PRIMARY KEY,
  rate NUMERIC(10, 2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS halbach_rates_rate_date_idx ON halbach_rates (rate_date);
