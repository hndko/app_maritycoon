import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { GameRepository, PropertyRecord, RoomPropertyRecord } from '../game/game.repository';
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
  const properties: PropertyRecord[] = [
    {
      id: 1,
      name: 'Serang',
      type: 'city',
      color_group: 'Brown',
      price: 600000,
      base_rent: 20000,
      rent_1_house: 100000,
      rent_2_house: 300000,
      rent_3_house: 900000,
      rent_4_house: 1600000,
      rent_hotel: 2500000,
      house_price: 500000,
      mortgage_value: 300000,
    },
    {
      id: 3,
      name: 'Cilegon',
      type: 'city',
      color_group: 'Brown',
      price: 600000,
      base_rent: 40000,
      rent_1_house: 200000,
      rent_2_house: 600000,
      rent_3_house: 1800000,
      rent_4_house: 3200000,
      rent_hotel: 5000000,
      house_price: 500000,
      mortgage_value: 300000,
    },
    {
      id: 4,
      name: 'Pajak Jalan',
      type: 'tax',
      color_group: null,
      price: null,
      base_rent: null,
      rent_1_house: null,
      rent_2_house: null,
      rent_3_house: null,
      rent_4_house: null,
      rent_hotel: null,
      house_price: null,
      mortgage_value: null,
    },
    {
      id: 7,
      name: 'Kesempatan',
      type: 'chance',
      color_group: null,
      price: null,
      base_rent: null,
      rent_1_house: null,
      rent_2_house: null,
      rent_3_house: null,
      rent_4_house: null,
      rent_hotel: null,
      house_price: null,
      mortgage_value: null,
    },
    {
      id: 30,
      name: 'Masuk Penjara',
      type: 'jail',
      color_group: null,
      price: null,
      base_rent: null,
      rent_1_house: null,
      rent_2_house: null,
      rent_3_house: null,
      rent_4_house: null,
      rent_hotel: null,
      house_price: null,
      mortgage_value: null,
    },
  ];
  const roomProperties: RoomPropertyRecord[] = [];
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
  const gameRepository = {
    appendLog,
    initializeRoomProperties: vi.fn(async (roomId: string) => {
      for (const property of properties) {
        if (!roomProperties.some((roomProperty) => roomProperty.property_id === property.id)) {
          roomProperties.push({
            property_id: property.id,
            owner_id: null,
            house_count: 0,
            hotel_count: 0,
            is_mortgaged: false,
          });
        }
      }
      expect(roomId).toBeTruthy();
    }),
    listRoomProperties: vi.fn(async () => roomProperties),
    findProperty: vi.fn(async (propertyId: number) => {
      return (
        properties.find((property) => property.id === propertyId) ?? {
          id: propertyId,
          name: 'Tile',
          type: propertyId === 0 ? 'start' : 'parking',
          color_group: null,
          price: null,
          base_rent: null,
          rent_1_house: null,
          rent_2_house: null,
          rent_3_house: null,
          rent_4_house: null,
          rent_hotel: null,
          house_price: null,
          mortgage_value: null,
        }
      );
    }),
    findRoomProperty: vi.fn(async (_roomId: string, propertyId: number) => {
      const roomProperty = roomProperties.find((property) => property.property_id === propertyId);
      const property = properties.find((propertyItem) => propertyItem.id === propertyId);
      return roomProperty && property ? { ...roomProperty, ...property } : null;
    }),
    listPropertiesByColorGroup: vi.fn(async (colorGroup: string) =>
      properties.filter((property) => property.color_group === colorGroup),
    ),
    updatePlayerPosition: vi.fn(async (playerId: string, position: number) => {
      const player = players.find((item) => item.id === playerId);
      if (player) {
        player.position = position;
      }
    }),
    addPlayerMoney: vi.fn(async (playerId: string, amount: number) => {
      const player = players.find((item) => item.id === playerId);
      if (player) {
        player.money += amount;
      }
    }),
    transferMoney: vi.fn(async (fromPlayerId: string, toPlayerId: string, amount: number) => {
      const fromPlayer = players.find((item) => item.id === fromPlayerId);
      const toPlayer = players.find((item) => item.id === toPlayerId);
      if (fromPlayer) {
        fromPlayer.money -= amount;
      }
      if (toPlayer) {
        toPlayer.money += amount;
      }
    }),
    buyProperty: vi.fn(async (_roomId: string, propertyId: number, ownerId: string, price: number) => {
      const player = players.find((item) => item.id === ownerId);
      const property = roomProperties.find((item) => item.property_id === propertyId);
      if (player) {
        player.money -= price;
      }
      if (property) {
        property.owner_id = ownerId;
      }
    }),
    buildOnProperty: vi.fn(
      async (
        _roomId: string,
        propertyId: number,
        playerId: string,
        cost: number,
        nextHouseCount: number,
        nextHotelCount: number,
      ) => {
        const player = players.find((item) => item.id === playerId);
        const property = roomProperties.find((item) => item.property_id === propertyId);
        if (player) {
          player.money -= cost;
        }
        if (property) {
          property.house_count = nextHouseCount;
          property.hotel_count = nextHotelCount;
        }
      },
    ),
    mortgageProperty: vi.fn(async (_roomId: string, propertyId: number, playerId: string, mortgageValue: number) => {
      const player = players.find((item) => item.id === playerId);
      const property = roomProperties.find((item) => item.property_id === propertyId);
      if (player) {
        player.money += mortgageValue;
      }
      if (property) {
        property.is_mortgaged = true;
      }
    }),
    unmortgageProperty: vi.fn(async (_roomId: string, propertyId: number, playerId: string, cost: number) => {
      const player = players.find((item) => item.id === playerId);
      const property = roomProperties.find((item) => item.property_id === propertyId);
      if (player) {
        player.money -= cost;
      }
      if (property) {
        property.is_mortgaged = false;
      }
    }),
    markPlayerBankrupt: vi.fn(async (playerId: string) => {
      const player = players.find((item) => item.id === playerId);
      if (player) {
        player.is_bankrupt = true;
        player.money = 0;
      }
    }),
    transferPlayerAssets: vi.fn(async (_roomId: string, fromPlayerId: string, toPlayerId: string | null) => {
      roomProperties
        .filter((property) => property.owner_id === fromPlayerId)
        .forEach((property) => {
          property.owner_id = toPlayerId;
          property.house_count = 0;
          property.hotel_count = 0;
        });
    }),
    finishRoom: vi.fn(async (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'finished';
      }
    }),
  };
  const redisService = new MemoryRedisService() as unknown as RedisService;
  const stateStore = new RealtimeStateStore(redisService);
  const service = new RealtimeService(
    roomsRepository as unknown as RoomsRepository,
    gameRepository as unknown as GameRepository,
    stateStore,
  );

  return {
    appendLog,
    gameRepository,
    players,
    roomProperties,
    service,
    stateStore,
  };
}

function createSessionToken(roomId: string, playerId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 60_000,
      player_id: playerId,
      room_id: roomId,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', process.env.SESSION_TOKEN_SECRET ?? 'dev-session-secret')
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function joinPayload(roomId: string, playerId: string, userNickname: string) {
  return {
    room_id: roomId,
    player_id: playerId,
    user_nickname: userNickname,
    session_token: createSessionToken(roomId, playerId),
  };
}

describe('RealtimeService', () => {
  it('joins a socket to an existing player slot and isolates room state', async () => {
    const { service } = createHarness();

    const state = await service.joinRoom(
      'socket-a',
      joinPayload(roomA.id, 'aaaaaaaa-1111-4111-8111-111111111111', 'Host A'),
    );

    expect(state.room_id).toBe(roomA.id);
    expect(state.players).toHaveLength(2);
    expect(state.players.some((player) => player.room_id === roomB.id)).toBe(false);
    expect(state.players[0].is_connected).toBe(true);
  });

  it('rejects sockets that claim a player from another room', async () => {
    const { service } = createHarness();

    await expect(
      service.joinRoom(
        'socket-a',
        joinPayload(roomA.id, 'cccccccc-2222-4222-8222-222222222222', 'Host B'),
      ),
    ).rejects.toThrow('Player is not part of this room');
  });

  it('rejects socket joins without a valid session token', async () => {
    const { service } = createHarness();

    await expect(
      service.joinRoom('socket-a', {
        room_id: roomA.id,
        player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
        user_nickname: 'Host A',
        session_token: 'invalid-token',
      }),
    ).rejects.toThrow('Invalid session token');
  });

  it('does not bump state version for read-only room state fetches', async () => {
    const { service } = createHarness();

    const joined = await service.joinRoom(
      'socket-a',
      joinPayload(roomA.id, 'aaaaaaaa-1111-4111-8111-111111111111', 'Host A'),
    );
    const fetched = await service.getRoomState(roomA.id);

    expect(fetched.state_version).toBe(joined.state_version);
  });

  it('marks disconnected players for reconnect without removing their slot', async () => {
    const { service } = createHarness();

    await service.joinRoom(
      'socket-a',
      joinPayload(roomA.id, 'aaaaaaaa-1111-4111-8111-111111111111', 'Host A'),
    );
    const result = await service.disconnect('socket-a');
    const state = await service.getRoomState(roomA.id);
    const host = state.players.find((player) => player.id === result?.session.playerId);

    expect(result?.session.roomId).toBe(roomA.id);
    expect(host?.is_connected).toBe(false);
    expect(host?.disconnected_at).toEqual(expect.any(String));
    expect(state.players).toHaveLength(2);
  });

  it('skips the current player when they disconnect during a skippable turn phase', async () => {
    const { service } = createHarness();

    await service.joinRoom(
      'socket-a',
      joinPayload(roomA.id, 'aaaaaaaa-1111-4111-8111-111111111111', 'Host A'),
    );
    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    const result = await service.disconnect('socket-a');

    expect(result?.turnChanged?.next_player_id).toBe('bbbbbbbb-1111-4111-8111-111111111111');
    expect(result?.state.turn.current_player_id).toBe('bbbbbbbb-1111-4111-8111-111111111111');
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
    expect(result.state.turn.phase).toBe('await_roll');
    expect(result.state.turn.deadline_at).toEqual(expect.any(String));
    expect(result.state.players.every((player) => player.money === roomA.starting_money)).toBe(true);
  });

  it('expires overdue turns server-side and advances to the next player', async () => {
    const { service, stateStore } = createHarness();
    const session = {
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    };

    await service.startGame(session);
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: session.playerId,
      phase: 'await_roll',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
      turn_started_at: '2026-01-01T00:00:00.000Z',
      turn_deadline_at: '2026-01-01T00:00:01.000Z',
    });

    const turnChanged = await service.expireTurnIfOverdue(roomA.id);
    const state = await service.getRoomState(roomA.id);

    expect(turnChanged?.next_player_id).toBe('bbbbbbbb-1111-4111-8111-111111111111');
    expect(state.turn.current_player_id).toBe('bbbbbbbb-1111-4111-8111-111111111111');
  });

  it('rate limits repeated socket gameplay actions', async () => {
    const { service } = createHarness();
    const session = {
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'bbbbbbbb-1111-4111-8111-111111111111',
      playerName: 'Player A',
    };

    for (let index = 0; index < 10; index += 1) {
      await expect(service.startGame(session)).rejects.toThrow('Only host can start the game');
    }

    await expect(service.startGame(session)).rejects.toThrow('Socket action rate limit exceeded');
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

  it('rolls dice on the server and moves the current player', async () => {
    const { service } = createHarness();
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0);

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    const result = await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    expect(result.diceRolled.total).toBe(2);
    expect(result.moved?.new_position).toBe(2);
    expect(result.state.turn.phase).toBe('free_action');
    randomSpy.mockRestore();
  });

  it('buys the pending property and deducts player money', async () => {
    const { players, service } = createHarness();
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.2);

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    const result = await service.buyProperty(
      {
        socketId: 'socket-a',
        roomId: roomA.id,
        playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
        playerName: 'Host A',
      },
      3,
    );

    expect(result.state.properties.find((property) => property.property_id === 3)?.owner_id).toBe(
      'aaaaaaaa-1111-4111-8111-111111111111',
    );
    expect(players[0].money).toBe(roomA.starting_money - 600000);
    randomSpy.mockRestore();
  });

  it('awards START bonus and pays rent automatically after landing on owned property', async () => {
    const { players, roomProperties, service } = createHarness();
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0);

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    players[0].position = 39;
    roomProperties.find((property) => property.property_id === 1)!.owner_id =
      'bbbbbbbb-1111-4111-8111-111111111111';

    const result = await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    expect(result.moved).toMatchObject({ new_position: 1, passed_start: true });
    expect(result.rentPaid).toMatchObject({
      payer_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      owner_id: 'bbbbbbbb-1111-4111-8111-111111111111',
      property_id: 1,
      amount: 20000,
    });
    expect(players[0].money).toBe(roomA.starting_money + 2000000 - 20000);
    expect(players[1].money).toBe(roomA.starting_money + 20000);
    randomSpy.mockRestore();
  });

  it('builds evenly on a completed color set', async () => {
    const { players, roomProperties, service, stateStore } = createHarness();

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    roomProperties.forEach((property) => {
      property.owner_id = 'aaaaaaaa-1111-4111-8111-111111111111';
    });
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      phase: 'free_action',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });

    const result = await service.buildHouse(
      {
        socketId: 'socket-a',
        roomId: roomA.id,
        playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
        playerName: 'Host A',
      },
      1,
    );

    expect(result.state.properties.find((property) => property.property_id === 1)?.house_count).toBe(1);
    expect(players[0].money).toBe(roomA.starting_money - 500000);
  });

  it('mortgages and unmortgages an owned property through authoritative state', async () => {
    const { players, roomProperties, service, stateStore } = createHarness();
    const session = {
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    };

    await service.startGame(session);
    roomProperties.find((property) => property.property_id === 1)!.owner_id = session.playerId;
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: session.playerId,
      phase: 'free_action',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });

    const mortgaged = await service.mortgageProperty(session, 1);
    expect(mortgaged.state.properties.find((property) => property.property_id === 1)?.is_mortgaged).toBe(true);
    expect(players[0].money).toBe(roomA.starting_money + 300000);

    const unmortgaged = await service.unmortgageProperty(session, 1);
    expect(unmortgaged.state.properties.find((property) => property.property_id === 1)?.is_mortgaged).toBe(false);
    expect(players[0].money).toBe(roomA.starting_money - 30000);
  });

  it('declares bankruptcy, transfers assets, and finishes when one player remains', async () => {
    const { roomProperties, service, stateStore } = createHarness();
    const debtorId = 'aaaaaaaa-1111-4111-8111-111111111111';
    const creditorId = 'bbbbbbbb-1111-4111-8111-111111111111';

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: debtorId,
      playerName: 'Host A',
    });
    roomProperties.find((property) => property.property_id === 1)!.owner_id = debtorId;
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: debtorId,
      phase: 'bankruptcy_resolution',
      double_count: 0,
      dice: null,
      pending_action: {
        type: 'bankruptcy_resolution',
        player_id: debtorId,
        creditor_id: creditorId,
        amount: 20000000,
        reason: 'rent',
      },
      jailed_player_ids: [],
      winner_id: null,
    });

    const result = await service.declareBankruptcy({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: debtorId,
      playerName: 'Host A',
    });

    expect(result.bankrupt.player_id).toBe(debtorId);
    expect(result.finished?.winner_id).toBe(creditorId);
    expect(result.state.status).toBe('finished');
    expect(result.state.properties.find((property) => property.property_id === 1)?.owner_id).toBe(creditorId);
  });

  it('sends a player to jail after triple double', async () => {
    const { players, service, stateStore } = createHarness();
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0);

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      phase: 'await_roll',
      double_count: 2,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });

    const result = await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    expect(result.moved?.new_position).toBe(10);
    expect(result.state.players.find((item) => item.id === players[0].id)?.is_in_jail).toBe(true);
    randomSpy.mockRestore();
  });

  it('keeps the turn after a double and advances after a normal roll', async () => {
    const { service, stateStore } = createHarness();
    const session = {
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    };

    await service.startGame(session);
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: session.playerId,
      phase: 'free_action',
      double_count: 1,
      dice: {
        dice_1: 2,
        dice_2: 2,
        is_double: true,
        rolled_at: '2026-01-01T00:00:00.000Z',
        total: 4,
      },
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });

    const extraTurn = await service.endTurn(session);
    expect(extraTurn.turnChanged.next_player_id).toBe(session.playerId);

    await stateStore.setGameplayState(roomA.id, {
      current_player_id: session.playerId,
      phase: 'free_action',
      double_count: 0,
      dice: {
        dice_1: 2,
        dice_2: 3,
        is_double: false,
        rolled_at: '2026-01-01T00:00:00.000Z',
        total: 5,
      },
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });

    const nextTurn = await service.endTurn(session);
    expect(nextTurn.turnChanged.next_player_id).toBe('bbbbbbbb-1111-4111-8111-111111111111');
  });

  it('resolves tax, chance, and go-to-jail special tiles from server state', async () => {
    const { players, service, stateStore } = createHarness();
    const randomSpy = vi.spyOn(Math, 'random');

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    randomSpy.mockReturnValueOnce(0.2).mockReturnValueOnce(0.2);
    await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    expect(players[0].position).toBe(4);
    expect(players[0].money).toBe(roomA.starting_money - 200000);

    players[0].position = 0;
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      phase: 'await_roll',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    expect(players[0].position).toBe(7);
    expect(players[0].money).toBe(roomA.starting_money + 300000);

    players[0].position = 28;
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      phase: 'await_roll',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
    });
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0);
    const goToJail = await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    expect(players[0].position).toBe(10);
    expect(goToJail.state.players.find((item) => item.id === players[0].id)?.is_in_jail).toBe(true);
    randomSpy.mockRestore();
  });

  it('creates rent debt when the payer cannot cover rent', async () => {
    const { players, roomProperties, service } = createHarness();
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0.2);

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });
    players[0].money = 10000;
    roomProperties.find((property) => property.property_id === 3)!.owner_id =
      'bbbbbbbb-1111-4111-8111-111111111111';

    const result = await service.rollDice({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    expect(result.state.turn.phase).toBe('bankruptcy_resolution');
    expect(result.state.pending_action).toMatchObject({
      amount: 40000,
      creditor_id: 'bbbbbbbb-1111-4111-8111-111111111111',
      player_id: 'aaaaaaaa-1111-4111-8111-111111111111',
      type: 'bankruptcy_resolution',
    });
    randomSpy.mockRestore();
  });

  it('resolves pending debt after a mortgage raises enough cash', async () => {
    const { players, roomProperties, service, stateStore } = createHarness();
    const debtorId = 'aaaaaaaa-1111-4111-8111-111111111111';
    const creditorId = 'bbbbbbbb-1111-4111-8111-111111111111';

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: debtorId,
      playerName: 'Host A',
    });
    players[0].money = 0;
    roomProperties.find((property) => property.property_id === 1)!.owner_id = debtorId;
    await stateStore.setGameplayState(roomA.id, {
      current_player_id: debtorId,
      phase: 'bankruptcy_resolution',
      double_count: 0,
      dice: null,
      pending_action: {
        type: 'bankruptcy_resolution',
        player_id: debtorId,
        creditor_id: creditorId,
        amount: 200000,
        reason: 'rent',
      },
      jailed_player_ids: [],
      winner_id: null,
    });

    const result = await service.mortgageProperty(
      {
        socketId: 'socket-a',
        roomId: roomA.id,
        playerId: debtorId,
        playerName: 'Host A',
      },
      1,
    );

    expect(result.state.turn.phase).toBe('free_action');
    expect(result.state.pending_action).toBeNull();
    expect(players[0].money).toBe(100000);
    expect(players[1].money).toBe(roomA.starting_money + 200000);
  });

  it('rejects roll_dice from a player outside the current turn', async () => {
    const { service } = createHarness();

    await service.startGame({
      socketId: 'socket-a',
      roomId: roomA.id,
      playerId: 'aaaaaaaa-1111-4111-8111-111111111111',
      playerName: 'Host A',
    });

    await expect(
      service.rollDice({
        socketId: 'socket-b',
        roomId: roomA.id,
        playerId: 'bbbbbbbb-1111-4111-8111-111111111111',
        playerName: 'Player A',
      }),
    ).rejects.toThrow('It is not this player turn');
  });
});
