import { describe, expect, it, vi } from 'vitest';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { GameRepository } from '../game/game.repository';
import {
  RoomPlayerRecord,
  RoomRecord,
  RoomsRepository,
  StartedGameRecord,
} from '../rooms/rooms.repository';
import { RealtimeStateStore } from './realtime-state.store';
import { RealtimeService } from './realtime.service';

class MemoryRedisService {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }

  async incr(key: string): Promise<number> {
    const nextValue = Number(this.values.get(key) ?? 0) + 1;
    this.values.set(key, String(nextValue));
    return nextValue;
  }
}

const roomA: RoomRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  room_code: 'ROOMA',
  room_name: 'Room A',
  password_hash: null,
  is_public: true,
  visibility: 'public',
  invite_code: null,
  max_players: 4,
  starting_money: 15000000,
  turn_timer_seconds: 60,
  status: 'waiting',
  created_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

const roomB: RoomRecord = {
  ...roomA,
  id: '22222222-2222-4222-8222-222222222222',
  room_code: 'ROOMB',
  room_name: 'Room B',
};

function createPlayer(
  id: string,
  roomId: string,
  playerName: string,
  isHost = false,
): RoomPlayerRecord {
  return {
    id,
    room_id: roomId,
    user_id: `${id.slice(0, 8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    player_name: playerName,
    money: 0,
    position: 0,
    is_bankrupt: false,
    is_host: isHost,
    is_ready: false,
    turn_order: null,
    joined_at: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createHarness() {
  const rooms = new Map<string, RoomRecord>([
    [roomA.id, { ...roomA }],
    [roomB.id, { ...roomB }],
  ]);
  const players = [
    createPlayer('aaaaaaaa-1111-4111-8111-111111111111', roomA.id, 'Host A', true),
    createPlayer('bbbbbbbb-1111-4111-8111-111111111111', roomA.id, 'Player A'),
    createPlayer('cccccccc-2222-4222-8222-222222222222', roomB.id, 'Host B', true),
  ];
  const appendLog = vi.fn(async () => undefined);

  const roomsRepository = {
    findById: vi.fn(async (roomId: string) => rooms.get(roomId) ?? null),
    findPlayerInRoom: vi.fn(async (roomId: string, playerId: string) => {
      return players.find((player) => player.room_id === roomId && player.id === playerId) ?? null;
    }),
    listPlayers: vi.fn(async (roomId: string) => {
      return players.filter((player) => player.room_id === roomId);
    }),
    startGame: vi.fn(async (roomId: string, startingMoney: number): Promise<StartedGameRecord> => {
      const room = rooms.get(roomId);

      if (room) {
        room.status = 'playing';
      }

      const roomPlayers = players.filter((player) => player.room_id === roomId);
      roomPlayers.forEach((player, index) => {
        player.money = startingMoney;
        player.position = 0;
        player.turn_order = index + 1;
      });

      return {
        first_turn_player_id: roomPlayers[0].id,
        players: roomPlayers,
      };
    }),
  };
  const redisService = new MemoryRedisService() as unknown as RedisService;
  const stateStore = new RealtimeStateStore(redisService);
  const service = new RealtimeService(
    roomsRepository as unknown as RoomsRepository,
    { appendLog } as unknown as GameRepository,
    stateStore,
  );

  return {
    appendLog,
    players,
    service,
    stateStore,
  };
}

describe('RealtimeService', () => {
  it('joins a socket to an existing player slot and isolates room state', async () => {
    const { service } = createHarness();

    const state = await service.joinRoom('socket-a', {
      room_id: roomA.id,
      player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      user_nickname: 'Host A',
    });

    expect(state.room_id).toBe(roomA.id);
    expect(state.players).toHaveLength(2);
    expect(state.players.some((player) => player.room_id === roomB.id)).toBe(false);
    expect(state.players[0].is_connected).toBe(true);
  });

  it('rejects sockets that claim a player from another room', async () => {
    const { service } = createHarness();

    await expect(
      service.joinRoom('socket-a', {
        room_id: roomA.id,
        player_id: 'cccccccc-2222-4222-8222-222222222222',
        user_nickname: 'Host B',
      }),
    ).rejects.toThrow('Player is not part of this room');
  });

  it('marks disconnected players for reconnect without removing their slot', async () => {
    const { service } = createHarness();

    await service.joinRoom('socket-a', {
      room_id: roomA.id,
      player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      user_nickname: 'Host A',
    });
    const session = await service.disconnect('socket-a');
    const state = await service.getRoomState(roomA.id);
    const host = state.players.find((player) => player.id === session?.playerId);

    expect(session?.roomId).toBe(roomA.id);
    expect(host?.is_connected).toBe(false);
    expect(host?.disconnected_at).toEqual(expect.any(String));
    expect(state.players).toHaveLength(2);
  });

  it('allows only the host to start a waiting game with at least two players', async () => {
    const { service } = createHarness();

    const result = await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    expect(result.started.first_turn_player_id).toBe('aaaaaaaa-1111-4111-8111-111111111111');
    expect(result.state.status).toBe('playing');
    expect(result.state.current_turn_player_id).toBe('aaaaaaaa-1111-4111-8111-111111111111');
    expect(result.state.players.every((player) => player.money === roomA.starting_money)).toBe(true);
  });

  it('rejects non-host start_game actions', async () => {
    const { service } = createHarness();

    await expect(
      service.startGame({
        socketId: 'socket-b',
        roomId: roomA.id,
        playerId: 'bbbbbbbb-1111-4111-8111-111111111111',
        playerName: 'Player A',
      }),
    ).rejects.toThrow('Only host can start the game');
  });

  it('rate limits chat messages per player and room', async () => {
    const { appendLog, service } = createHarness();
    const session = {
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    };

    for (let index = 0; index < 5; index += 1) {
      await service.createChatBroadcast(session, { message: `Halo ${index}` });
    }

    await expect(
      service.createChatBroadcast(session, { message: 'Terlalu cepat' }),
    ).rejects.toThrow('Chat rate limit exceeded');
    expect(appendLog).toHaveBeenCalledTimes(5);
  });
});
