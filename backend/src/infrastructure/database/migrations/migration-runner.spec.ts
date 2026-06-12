import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getMigrationFiles } from './migration-runner';

const tempDirs: string[] = [];

async function createTempMigrationDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'maritycoon-migrations-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe('getMigrationFiles', () => {
  it('returns SQL migrations sorted by numeric prefix', async () => {
    const dir = await createTempMigrationDir();
    await fs.writeFile(path.join(dir, '002_second.sql'), 'SELECT 2;');
    await fs.writeFile(path.join(dir, '001_first.sql'), 'SELECT 1;');
    await fs.writeFile(path.join(dir, 'README.md'), 'ignored');

    const migrations = await getMigrationFiles(dir);

    expect(migrations.map((migration) => migration.name)).toEqual([
      '001_first.sql',
      '002_second.sql',
    ]);
    expect(migrations.map((migration) => migration.id)).toEqual(['001', '002']);
  });
});
