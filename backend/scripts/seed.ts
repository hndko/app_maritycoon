import { createDatabasePool } from '../src/infrastructure/database/database.client';
import { seedDatabase } from '../src/infrastructure/database/seeds/board-seeder';

async function main(): Promise<void> {
  const pool = createDatabasePool();

  try {
    const result = await seedDatabase(pool);
    console.log(`properties upserted: ${result.propertiesUpserted}`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
