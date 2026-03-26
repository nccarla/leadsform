import pg from 'pg';
import 'dotenv/config';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('Falta DATABASE_URL en .env');
    process.exit(1);
}
export const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});
