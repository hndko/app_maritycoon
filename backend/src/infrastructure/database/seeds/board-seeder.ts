import type { Pool, PoolClient } from 'pg';
import { boardTileSeeds } from './board-seed';

export type SeedResult = {
  propertiesUpserted: number;
};

const upsertPropertySql = `
  INSERT INTO properties (
    id,
    name,
    type,
    color_group,
    price,
    base_rent,
    rent_1_house,
    rent_2_house,
    rent_3_house,
    rent_4_house,
    rent_hotel,
    house_price,
    mortgage_value
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    color_group = EXCLUDED.color_group,
    price = EXCLUDED.price,
    base_rent = EXCLUDED.base_rent,
    rent_1_house = EXCLUDED.rent_1_house,
    rent_2_house = EXCLUDED.rent_2_house,
    rent_3_house = EXCLUDED.rent_3_house,
    rent_4_house = EXCLUDED.rent_4_house,
    rent_hotel = EXCLUDED.rent_hotel,
    house_price = EXCLUDED.house_price,
    mortgage_value = EXCLUDED.mortgage_value
`;

async function seedBoardTiles(client: PoolClient): Promise<number> {
  for (const tile of boardTileSeeds) {
    await client.query(upsertPropertySql, [
      tile.id,
      tile.name,
      tile.type,
      tile.colorGroup,
      tile.price,
      tile.baseRent,
      tile.rent1House,
      tile.rent2House,
      tile.rent3House,
      tile.rent4House,
      tile.rentHotel,
      tile.housePrice,
      tile.mortgageValue,
    ]);
  }

  return boardTileSeeds.length;
}

export async function seedDatabase(pool: Pool): Promise<SeedResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const propertiesUpserted = await seedBoardTiles(client);
    await client.query('COMMIT');

    return {
      propertiesUpserted,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
