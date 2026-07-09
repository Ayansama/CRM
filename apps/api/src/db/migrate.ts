import { getPool } from './pool';

const migrationSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS imports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT now(),
  total_rows    INT NOT NULL,
  success_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'processing',
  header_hash   TEXT
);

CREATE TABLE IF NOT EXISTS import_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id   UUID REFERENCES imports(id) ON DELETE CASCADE,
  row_index   INT NOT NULL,
  status      TEXT NOT NULL,
  skip_reason TEXT,
  data        JSONB
);

CREATE TABLE IF NOT EXISTS column_mappings (
  header_hash  TEXT PRIMARY KEY,
  mapping      JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  hit_count    INT DEFAULT 1
);
`;

export const runMigrations = async (): Promise<void> => {
  const pool = getPool();
  if (!pool) {
    console.log('Skipping migrations: Stateless mode (no database connected).');
    return;
  }

  console.log('Running database migrations...');
  try {
    await pool.query(migrationSql);
    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.warn('Database migration failed (server will still start in reduced mode):', error);
    // Do not throw — allow server to continue without a functioning DB
  }
};
