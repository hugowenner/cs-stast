-- Additive only. No historical payload is enqueued or rewritten by this migration.
BEGIN;
CREATE TABLE ingest_payload_revisions (
  id UUID PRIMARY KEY,
  payload_id TEXT NOT NULL REFERENCES match_payloads(id) ON DELETE RESTRICT,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  parser_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(payload_id, payload_hash)
);
CREATE TABLE normalization_jobs (
  id UUID PRIMARY KEY,
  revision_id UUID NOT NULL REFERENCES ingest_payload_revisions(id) ON DELETE RESTRICT,
  source TEXT NOT NULL,
  source_match_id TEXT NOT NULL,
  normalizer_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','RETRY','COMPLETED','FAILED','SUPERSEDED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_token UUID,
  lease_until TIMESTAMP(3),
  owner TEXT,
  last_error JSONB,
  started_at TIMESTAMP(3),
  finished_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(revision_id, normalizer_version)
);
CREATE INDEX normalization_jobs_claim ON normalization_jobs(normalizer_version,status,available_at,lease_until);
CREATE INDEX normalization_jobs_match ON normalization_jobs(source,source_match_id);
CREATE INDEX normalization_jobs_lease ON normalization_jobs(status,lease_until);
CREATE TABLE normalization_attempts (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES normalization_jobs(id) ON DELETE RESTRICT,
  lease_token UUID NOT NULL UNIQUE,
  attempt INTEGER NOT NULL,
  owner TEXT NOT NULL,
  started_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP(3),
  outcome TEXT,
  error JSONB
);
CREATE INDEX normalization_attempts_job ON normalization_attempts(job_id,started_at);
CREATE TABLE demo_match_projections (
  job_id UUID PRIMARY KEY REFERENCES normalization_jobs(id) ON DELETE RESTRICT,
  match_id TEXT NOT NULL REFERENCES "Match"(id) ON DELETE RESTRICT,
  normalizer_version TEXT NOT NULL,
  normalized JSONB NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX demo_match_projections_match ON demo_match_projections(match_id,created_at);
COMMIT;
