import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
let pool: Pool | null = null;

if (databaseUrl) {
  console.log('DATABASE_URL detected. Initializing PostgreSQL pool...');
  const isNeon = databaseUrl.includes('neon.tech');
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });
} else {
  console.warn('DATABASE_URL is not set. API will run in stateless in-memory mode.');
}

export const query = async (text: string, params?: any[]) => {
  if (!pool) {
    // Return empty mock structure when DB is disabled
    return { rows: [] as any[], rowCount: 0 };
  }
  return pool.query(text, params);
};

export const getPool = () => pool;
export const isDbConnected = (): boolean => pool !== null;
