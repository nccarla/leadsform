import pg from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Falta DATABASE_URL en .env');
  process.exit(1);
}

const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});
