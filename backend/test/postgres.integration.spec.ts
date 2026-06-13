import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL_TEST;
const describeIf = databaseUrl ? describe : describe.skip;

describeIf('PostgreSQL integration', () => {
  it('can query the database and inspect core tables', async () => {
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const health = await pool.query<{ ok: number }>('SELECT 1 AS ok');
      expect(health.rows[0].ok).toBe(1);

      const tables = await pool.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN ('rooms', 'room_players', 'properties', 'game_logs')
          ORDER BY table_name
        `,
      );

      expect(tables.rows.map((row) => row.table_name)).toEqual([
        'game_logs',
        'properties',
        'room_players',
        'rooms',
      ]);
    } finally {
      await pool.end();
    }
  });
});
