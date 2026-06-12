import { Pool } from 'pg';
import { getDatabaseUrl } from './database.config';

export function createDatabasePool(): Pool {
  return new Pool({
    connectionString: getDatabaseUrl()
  });
}
