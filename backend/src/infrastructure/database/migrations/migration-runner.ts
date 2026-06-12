import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';

export type MigrationFile = {
  id: string;
  filePath: string;
  name: string;
};

export type MigrationResult = {
  applied: string[];
  skipped: string[];
};

const migrationPattern = /^(\d{3,})_.+\.sql$/;

export async function getMigrationFiles(
  migrationsDir: string,
): Promise<MigrationFile[]> {
  const entries = await fs.readdir(migrationsDir);

  return entries
    .filter((entry) => migrationPattern.test(entry))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const match = name.match(migrationPattern);

      if (!match) {
        throw new Error(`Invalid migration filename: ${name}`);
      }

      return {
        id: match[1],
        name,
        filePath: path.join(migrationsDir, name),
      };
    });
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrationIds(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM schema_migrations ORDER BY id ASC',
  );

  return new Set(result.rows.map((row) => row.id));
}

async function applyMigration(
  client: PoolClient,
  migration: MigrationFile,
): Promise<void> {
  const sql = await fs.readFile(migration.filePath, 'utf8');

  await client.query(sql);
  await client.query(
    'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
    [migration.id, migration.name],
  );
}

export async function runMigrations(
  pool: Pool,
  migrationsDir: string,
): Promise<MigrationResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureMigrationTable(client);

    const migrations = await getMigrationFiles(migrationsDir);
    const appliedIds = await getAppliedMigrationIds(client);
    const result: MigrationResult = {
      applied: [],
      skipped: [],
    };

    for (const migration of migrations) {
      if (appliedIds.has(migration.id)) {
        result.skipped.push(migration.name);
        continue;
      }

      await applyMigration(client, migration);
      result.applied.push(migration.name);
    }

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
