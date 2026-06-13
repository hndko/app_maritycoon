import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';

export type PropertyRecord = {
  id: number;
  name: string;
  type: string;
  color_group: string | null;
  price: number | null;
  base_rent: number | null;
  rent_1_house: number | null;
  rent_2_house: number | null;
  rent_3_house: number | null;
  rent_4_house: number | null;
  rent_hotel: number | null;
  house_price: number | null;
  mortgage_value: number | null;
};

export type RoomPropertyRecord = {
  property_id: number;
  owner_id: string | null;
  house_count: number;
  hotel_count: number;
  is_mortgaged: boolean;
};

export type RoomPropertyWithTileRecord = RoomPropertyRecord & PropertyRecord;

export type GameLogRecord = {
  event_type: string;
  payload: Record<string, unknown>;
  created_at: Date;
};

@Injectable()
export class GameRepository {
  constructor(private readonly database: DatabaseService) {}

  async listProperties(): Promise<PropertyRecord[]> {
    const result = await this.database.query<PropertyRecord>(
      `
        SELECT
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
        FROM properties
        ORDER BY id ASC
      `,
    );

    return result.rows;
  }

  async appendLog(
    roomId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.database.query(
      `
        INSERT INTO game_logs (room_id, event_type, payload)
        VALUES ($1, $2, $3::jsonb)
      `,
      [roomId, eventType, JSON.stringify(payload)],
    );
  }

  async listLogs(roomId: string, limit = 30): Promise<GameLogRecord[]> {
    const result = await this.database.query<GameLogRecord>(
      `
        SELECT event_type, payload, created_at
        FROM game_logs
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [roomId, limit],
    );

    return result.rows.reverse();
  }

  async initializeRoomProperties(roomId: string): Promise<void> {
    await this.database.query(
      `
        INSERT INTO room_properties (room_id, property_id)
        SELECT $1, id
        FROM properties
        WHERE price IS NOT NULL
        ON CONFLICT (room_id, property_id) DO NOTHING
      `,
      [roomId],
    );
  }

  async listRoomProperties(roomId: string): Promise<RoomPropertyRecord[]> {
    const result = await this.database.query<RoomPropertyRecord>(
      `
        SELECT property_id, owner_id, house_count, hotel_count, is_mortgaged
        FROM room_properties
        WHERE room_id = $1
        ORDER BY property_id ASC
      `,
      [roomId],
    );

    return result.rows;
  }

  async findRoomProperty(
    roomId: string,
    propertyId: number,
  ): Promise<RoomPropertyWithTileRecord | null> {
    const result = await this.database.query<RoomPropertyWithTileRecord>(
      `
        SELECT
          room_properties.property_id,
          room_properties.owner_id,
          room_properties.house_count,
          room_properties.hotel_count,
          room_properties.is_mortgaged,
          properties.id,
          properties.name,
          properties.type,
          properties.color_group,
          properties.price,
          properties.base_rent,
          properties.rent_1_house,
          properties.rent_2_house,
          properties.rent_3_house,
          properties.rent_4_house,
          properties.rent_hotel,
          properties.house_price,
          properties.mortgage_value
        FROM room_properties
        INNER JOIN properties ON properties.id = room_properties.property_id
        WHERE room_properties.room_id = $1 AND room_properties.property_id = $2
      `,
      [roomId, propertyId],
    );

    return result.rows[0] ?? null;
  }

  async findProperty(propertyId: number): Promise<PropertyRecord | null> {
    const result = await this.database.query<PropertyRecord>(
      `
        SELECT
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
        FROM properties
        WHERE id = $1
      `,
      [propertyId],
    );

    return result.rows[0] ?? null;
  }

  async listPropertiesByColorGroup(colorGroup: string): Promise<PropertyRecord[]> {
    const result = await this.database.query<PropertyRecord>(
      `
        SELECT
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
        FROM properties
        WHERE color_group = $1
        ORDER BY id ASC
      `,
      [colorGroup],
    );

    return result.rows;
  }

  async updatePlayerPosition(playerId: string, position: number): Promise<void> {
    await this.database.query('UPDATE room_players SET position = $1 WHERE id = $2', [
      position,
      playerId,
    ]);
  }

  async addPlayerMoney(playerId: string, amount: number): Promise<void> {
    await this.database.query('UPDATE room_players SET money = money + $1 WHERE id = $2', [
      amount,
      playerId,
    ]);
  }

  async transferMoney(fromPlayerId: string, toPlayerId: string, amount: number): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('UPDATE room_players SET money = money - $1 WHERE id = $2', [
        amount,
        fromPlayerId,
      ]);
      await client.query('UPDATE room_players SET money = money + $1 WHERE id = $2', [
        amount,
        toPlayerId,
      ]);
    });
  }

  async markPlayerBankrupt(playerId: string): Promise<void> {
    await this.database.query(
      'UPDATE room_players SET is_bankrupt = TRUE, money = 0 WHERE id = $1',
      [playerId],
    );
  }

  async buyProperty(roomId: string, propertyId: number, ownerId: string, price: number): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('UPDATE room_players SET money = money - $1 WHERE id = $2', [
        price,
        ownerId,
      ]);
      await client.query(
        `
          UPDATE room_properties
          SET owner_id = $1
          WHERE room_id = $2 AND property_id = $3 AND owner_id IS NULL
        `,
        [ownerId, roomId, propertyId],
      );
    });
  }

  async buildOnProperty(
    roomId: string,
    propertyId: number,
    playerId: string,
    cost: number,
    nextHouseCount: number,
    nextHotelCount: number,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('UPDATE room_players SET money = money - $1 WHERE id = $2', [
        cost,
        playerId,
      ]);
      await client.query(
        `
          UPDATE room_properties
          SET house_count = $1, hotel_count = $2
          WHERE room_id = $3 AND property_id = $4 AND owner_id = $5
        `,
        [nextHouseCount, nextHotelCount, roomId, propertyId, playerId],
      );
    });
  }

  async mortgageProperty(
    roomId: string,
    propertyId: number,
    playerId: string,
    mortgageValue: number,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('UPDATE room_players SET money = money + $1 WHERE id = $2', [
        mortgageValue,
        playerId,
      ]);
      await client.query(
        `
          UPDATE room_properties
          SET is_mortgaged = TRUE
          WHERE room_id = $1
            AND property_id = $2
            AND owner_id = $3
            AND house_count = 0
            AND hotel_count = 0
        `,
        [roomId, propertyId, playerId],
      );
    });
  }

  async unmortgageProperty(
    roomId: string,
    propertyId: number,
    playerId: string,
    cost: number,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('UPDATE room_players SET money = money - $1 WHERE id = $2', [
        cost,
        playerId,
      ]);
      await client.query(
        `
          UPDATE room_properties
          SET is_mortgaged = FALSE
          WHERE room_id = $1 AND property_id = $2 AND owner_id = $3
        `,
        [roomId, propertyId, playerId],
      );
    });
  }

  async transferPlayerAssets(roomId: string, fromPlayerId: string, toPlayerId: string | null): Promise<void> {
    await this.database.query(
      `
        UPDATE room_properties
        SET owner_id = $1, house_count = 0, hotel_count = 0
        WHERE room_id = $2 AND owner_id = $3
      `,
      [toPlayerId, roomId, fromPlayerId],
    );
  }

  async sellBuilding(
    roomId: string,
    propertyId: number,
    playerId: string,
    refund: number,
    nextHouseCount: number,
    nextHotelCount: number,
  ): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query('UPDATE room_players SET money = money + $1 WHERE id = $2', [
        refund,
        playerId,
      ]);
      await client.query(
        `
          UPDATE room_properties
          SET house_count = $1, hotel_count = $2
          WHERE room_id = $3 AND property_id = $4 AND owner_id = $5
        `,
        [nextHouseCount, nextHotelCount, roomId, propertyId, playerId],
      );
    });
  }

  async finishRoom(roomId: string): Promise<void> {
    await this.database.query("UPDATE rooms SET status = 'finished' WHERE id = $1", [roomId]);
  }
}
