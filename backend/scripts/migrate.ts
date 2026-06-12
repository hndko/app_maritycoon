import path from 'node:path';
import { createDatabasePool } from '../src/infrastructure/database/database.client';
import { runMigrations } from '../src/infrastructure/database/migrations/migration-runner';

async function main(): Promise<void> {
  const pool = createDatabasePool();
  const migrationsDir = path.resolve(__dirname, '../database/migrations');

  try {
    const result = await runMigrations(pool, migrationsDir);

    for (const migration of result.applied) {
      console.log(`applied: ${migration}`);
    }

    for (const migration of result.skipped) {
      console.log(`skipped: ${migration}`);
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
