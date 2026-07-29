import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing');
}

// Use neon HTTP driver specifically designed for Vercel/Serverless
// to avoid connection exhaustion under load
const client = neon(connectionString);
export const db = drizzle(client, { schema });

/**
 * Normalizes db.execute() results. Some Drizzle drivers return an array, 
 * while neon-http returns { rowCount, rows }. This guarantees an array.
 */
export async function executeQuery(query: any): Promise<any[]> {
  const result = await db.execute(query);
  return Array.isArray(result) ? result : ((result as any).rows || []);
}
