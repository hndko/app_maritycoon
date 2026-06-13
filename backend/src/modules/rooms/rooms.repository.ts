import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';

export type RoomVisibility = 'public' | 'private' | 'invite_only';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type CreateRoomRepositoryInput = {
  roomCode: string;
  roomName: string;
  passwordHash: string | null;
  isPublic: boolean;
  visibility: RoomVisibility;
  inviteCode: string | null;
  maxPlayers: number;
  startingMoney: number;
  turnTimerSeconds: number;
  hostNickname: string;
};

export type CreatedRoomRecord = {
  room_id: string;
  room_code: string;
  host_guest_id: string;
  host_player_id: string;
};

export type RoomRecord = {
  id: string;
  room_code: string;
  room_name: string;
  password_hash: string | null;
  is_public: boolean;
  visibility: RoomVisibility;
  invite_code: string | null;
  max_players: number;
  starting_money: number;
  turn_timer_seconds: number;
  status: RoomStatus;
  created_by: string;
  created_at: Date;
};

export type PublicRoomRecord = {
  room_id: string;
  room_name: string;
  room_code: string;
  current_players: number;
  max_players: number;
  host_name: string;
  status: RoomStatus;
};

export type RoomPlayerRecord = {
  id: string;
  room_id: string;
  user_id: string;
  player_name: string;
  money: number;
  position: number;
  is_bankrupt: boolean;
  is_host: boolean;
  is_ready: boolean;
  turn_order: number | null;
  joined_at: Date;
};

export type StartedGameRecord = {
  first_turn_player_id: string;
  players: RoomPlayerRecord[];
};

export type JoinPlayerInput = {
  roomId: string;
  playerName: string;
};

export type PublicRoomsFilter = {
  status?: RoomStatus;
  maxPlayers?: number;
  full?: boolean;
};

export type UpdateRoomSettingsInput = {
  roomId: string;
  roomName: string;
  maxPlayers: number;
  startingMoney: number;
  turnTimerSeconds: number;
};

@Injectable()
export class RoomsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createRoomWithHost(
    input: CreateRoomRepositoryInput,
  ): Promise<CreatedRoomRecord> {
    return this.database.transaction(async (client) => {
      const guest = await client.query<{ id: string }>(
        'INSERT INTO users_guest (nickname) VALUES ($1) RETURNING id',
        [input.hostNickname],
      );
      const hostGuestId = guest.rows[0].id;

      const room = await client.query<{ id: string; room_code: string }>(
        `
          INSERT INTO rooms (
            room_code,
            room_name,
            password_hash,
            is_public,
            visibility,
            invite_code,
            max_players,
            starting_money,
            turn_timer_seconds,
            created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, room_code
        `,
        [
          input.roomCode,
          input.roomName,
          input.passwordHash,
          input.isPublic,
          input.visibility,
          input.inviteCode,
          input.maxPlayers,
          input.startingMoney,
          input.turnTimerSeconds,
          hostGuestId,
        ],
      );
      const createdRoom = room.rows[0];

      const player = await client.query<{ id: string }>(
        `
          INSERT INTO room_players (
            room_id,
            user_id,
            player_name,
            is_host
          )
          VALUES ($1, $2, $3, TRUE)
          RETURNING id
        `,
        [createdRoom.id, hostGuestId, input.hostNickname],
      );

      return {
        room_id: createdRoom.id,
        room_code: createdRoom.room_code,
        host_guest_id: hostGuestId,
        host_player_id: player.rows[0].id,
      };
    });
  }

  async roomCodeExists(roomCode: string): Promise<boolean> {
    const result = await this.database.query<{ exists: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM rooms WHERE room_code = $1) AS "exists"',
      [roomCode],
    );

    return result.rows[0].exists;
  }

  async findByCode(roomCode: string): Promise<RoomRecord | null> {
    const result = await this.database.query<RoomRecord>(
      'SELECT * FROM rooms WHERE room_code = $1',
      [roomCode],
    );

    return result.rows[0] ?? null;
  }

  async findByReference(roomReference: string): Promise<RoomRecord | null> {
    const result = await this.database.query<RoomRecord>(
      'SELECT * FROM rooms WHERE id::TEXT = $1 OR room_code = UPPER($1)',
      [roomReference],
    );

    return result.rows[0] ?? null;
  }

  async findById(roomId: string): Promise<RoomRecord | null> {
    const result = await this.database.query<RoomRecord>(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId],
    );

    return result.rows[0] ?? null;
  }

  async listPlayingRoomIds(): Promise<string[]> {
    const result = await this.database.query<{ id: string }>(
      "SELECT id FROM rooms WHERE status = 'playing'",
    );

    return result.rows.map((room) => room.id);
  }

  async countPlayers(roomId: string): Promise<number> {
    const result = await this.database.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM room_players WHERE room_id = $1',
      [roomId],
    );

    return Number(result.rows[0].count);
  }

  async addPlayer(input: JoinPlayerInput): Promise<{
    guest_id: string;
    player_id: string;
  }> {
    return this.database.transaction(async (client) => {
      const guest = await client.query<{ id: string }>(
        'INSERT INTO users_guest (nickname) VALUES ($1) RETURNING id',
        [input.playerName],
      );
      const guestId = guest.rows[0].id;

      const player = await client.query<{ id: string }>(
        `
          INSERT INTO room_players (room_id, user_id, player_name)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [input.roomId, guestId, input.playerName],
      );

      return {
        guest_id: guestId,
        player_id: player.rows[0].id,
      };
    });
  }

  async listPublicRooms(filter: PublicRoomsFilter): Promise<PublicRoomRecord[]> {
    const clauses = ['rooms.is_public = TRUE'];
    const params: unknown[] = [];

    if (filter.status) {
      params.push(filter.status);
      clauses.push(`rooms.status = $${params.length}`);
    }

    if (filter.maxPlayers) {
      params.push(filter.maxPlayers);
      clauses.push(`rooms.max_players = $${params.length}`);
    }

    const havingClause =
      filter.full === undefined
        ? ''
        : filter.full
          ? 'HAVING COUNT(room_players.id) >= rooms.max_players'
          : 'HAVING COUNT(room_players.id) < rooms.max_players';

    const result = await this.database.query<PublicRoomRecord>(
      `
        SELECT
          rooms.id AS room_id,
          rooms.room_name,
          rooms.room_code,
          COUNT(room_players.id)::INT AS current_players,
          rooms.max_players,
          host.player_name AS host_name,
          rooms.status
        FROM rooms
        LEFT JOIN room_players ON room_players.room_id = rooms.id
        LEFT JOIN room_players host
          ON host.room_id = rooms.id AND host.is_host = TRUE
        WHERE ${clauses.join(' AND ')}
        GROUP BY rooms.id, host.player_name
        ${havingClause}
        ORDER BY rooms.created_at DESC
      `,
      params,
    );

    return result.rows;
  }

  async listPlayers(roomId: string): Promise<RoomPlayerRecord[]> {
    const result = await this.database.query<RoomPlayerRecord>(
      `
        SELECT
          id,
          room_id,
          user_id,
          player_name,
          money,
          position,
          is_bankrupt,
          is_host,
          is_ready,
          turn_order,
          joined_at
        FROM room_players
        WHERE room_id = $1
        ORDER BY is_host DESC, joined_at ASC
      `,
      [roomId],
    );

    return result.rows;
  }

  async findPlayerInRoom(
    roomId: string,
    playerId: string,
  ): Promise<RoomPlayerRecord | null> {
    const result = await this.database.query<RoomPlayerRecord>(
      `
        SELECT
          id,
          room_id,
          user_id,
          player_name,
          money,
          position,
          is_bankrupt,
          is_host,
          is_ready,
          turn_order,
          joined_at
        FROM room_players
        WHERE room_id = $1 AND id = $2
      `,
      [roomId, playerId],
    );

    return result.rows[0] ?? null;
  }

  async setPlayerReady(roomId: string, playerId: string, isReady: boolean): Promise<void> {
    await this.database.query(
      'UPDATE room_players SET is_ready = $1 WHERE room_id = $2 AND id = $3',
      [isReady, roomId, playerId],
    );
  }

  async removePlayer(roomId: string, playerId: string): Promise<void> {
    await this.database.query(
      'DELETE FROM room_players WHERE room_id = $1 AND id = $2 AND is_host = FALSE',
      [roomId, playerId],
    );
  }

  async transferHost(roomId: string, fromPlayerId: string, toPlayerId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        'UPDATE room_players SET is_host = FALSE WHERE room_id = $1 AND id = $2 AND is_host = TRUE',
        [roomId, fromPlayerId],
      );
      await client.query(
        'UPDATE room_players SET is_host = TRUE WHERE room_id = $1 AND id = $2',
        [roomId, toPlayerId],
      );
    });
  }

  async updateRoomSettings(input: UpdateRoomSettingsInput): Promise<void> {
    await this.database.query(
      `
        UPDATE rooms
        SET room_name = $1, max_players = $2, starting_money = $3, turn_timer_seconds = $4
        WHERE id = $5 AND status = 'waiting'
      `,
      [
        input.roomName,
        input.maxPlayers,
        input.startingMoney,
        input.turnTimerSeconds,
        input.roomId,
      ],
    );
  }

  async finishRoom(roomId: string): Promise<void> {
    await this.database.query("UPDATE rooms SET status = 'finished' WHERE id = $1", [roomId]);
  }

  async resetRoomForReplay(roomId: string): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query("UPDATE rooms SET status = 'waiting' WHERE id = $1", [roomId]);
      await client.query(
        `
          UPDATE room_players
          SET money = 0,
              position = 0,
              is_bankrupt = FALSE,
              is_ready = FALSE,
              turn_order = NULL
          WHERE room_id = $1
        `,
        [roomId],
      );
    });
  }

  async startGame(roomId: string, startingMoney: number): Promise<StartedGameRecord> {
    return this.database.transaction(async (client) => {
      const playerResult = await client.query<RoomPlayerRecord>(
        `
          SELECT
            id,
            room_id,
            user_id,
            player_name,
            money,
            position,
            is_bankrupt,
            is_host,
            is_ready,
            turn_order,
            joined_at
          FROM room_players
          WHERE room_id = $1
          ORDER BY joined_at ASC
        `,
        [roomId],
      );
      const players = playerResult.rows;

      for (let index = 0; index < players.length; index += 1) {
        await client.query(
          `
            UPDATE room_players
            SET money = $1, position = 0, turn_order = $2
            WHERE id = $3
          `,
          [startingMoney, index + 1, players[index].id],
        );
      }

      await client.query("UPDATE rooms SET status = 'playing' WHERE id = $1", [roomId]);

      const updatedPlayers = await client.query<RoomPlayerRecord>(
        `
          SELECT
            id,
            room_id,
            user_id,
            player_name,
            money,
            position,
            is_bankrupt,
            is_host,
            is_ready,
            turn_order,
            joined_at
          FROM room_players
          WHERE room_id = $1
          ORDER BY turn_order ASC
        `,
        [roomId],
      );

      return {
        first_turn_player_id: updatedPlayers.rows[0].id,
        players: updatedPlayers.rows,
      };
    });
  }

  getClientForTests(): DatabaseService {
    return this.database;
  }
}
