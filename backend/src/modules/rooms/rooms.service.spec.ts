import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RoomCodeService } from './room-code.service';
import { RoomsRepository } from './rooms.repository';
import { RoomsService } from './rooms.service';
import { PasswordService } from '../../infrastructure/security/password.service';

function createService({
  repository,
  passwordService,
  roomCode = 'ABCD1234',
}: {
  repository: Partial<RoomsRepository>;
  passwordService?: Partial<PasswordService>;
  roomCode?: string;
}): RoomsService {
  const roomCodeService = {
    generate: vi.fn(() => roomCode),
  } as unknown as RoomCodeService;

  return new RoomsService(
    repository as RoomsRepository,
    roomCodeService,
    {
      hash: vi.fn(async () => 'hashed-password'),
      compare: vi.fn(async () => true),
      ...passwordService,
    } as PasswordService,
  );
}

const waitingRoom = {
  id: 'room-1',
  room_code: 'ABCD1234',
  room_name: 'Test Room',
  password_hash: null,
  is_public: true,
  visibility: 'public' as const,
  invite_code: null,
  max_players: 4,
  starting_money: 15000000,
  turn_timer_seconds: 60,
  status: 'waiting' as const,
  created_by: 'guest-1',
  created_at: new Date(),
};

describe('RoomsService', () => {
  it('creates a room with hashed password and share URL', async () => {
    const repository = {
      roomCodeExists: vi.fn(async () => false),
      createRoomWithHost: vi.fn(async () => ({
        room_id: 'room-1',
        room_code: 'ABCD1234',
        host_guest_id: 'guest-1',
        host_player_id: 'player-1',
      })),
    };
    const service = createService({ repository });

    const result = await service.createRoom({
      host_nickname: 'Budi',
      room_name: 'Room Seru',
      max_players: 4,
      is_public: false,
      password: 'secret123',
      starting_money: 15000000,
    });

    expect(repository.createRoomWithHost).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'hashed-password',
        isPublic: false,
        visibility: 'private',
      }),
    );
    expect(result).toEqual({
      room_id: 'room-1',
      room_code: 'ABCD1234',
      share_url: 'http://localhost:3000/room/ABCD1234',
      guest_id: 'guest-1',
      player_id: 'player-1',
    });
  });

  it('asks for a password when joining a protected room without password', async () => {
    const service = createService({
      repository: {
        findByCode: vi.fn(async () => ({
          ...waitingRoom,
          password_hash: 'hashed-password',
          is_public: false,
          visibility: 'private' as const,
        })),
      },
    });

    await expect(
      service.joinRoom({
        room_code: 'abcd1234',
        player_name: 'Siti',
      }),
    ).resolves.toEqual({
      room_id: 'room-1',
      status: 'need_password',
    });
  });

  it('rejects an invalid room password', async () => {
    const service = createService({
      repository: {
        findByCode: vi.fn(async () => ({
          ...waitingRoom,
          password_hash: 'hashed-password',
          is_public: false,
          visibility: 'private' as const,
        })),
      },
      passwordService: {
        compare: vi.fn(async () => false),
      },
    });

    await expect(
      service.joinRoom({
        room_code: 'ABCD1234',
        player_name: 'Siti',
        password: 'wrong',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns full when the room has reached capacity', async () => {
    const service = createService({
      repository: {
        findByCode: vi.fn(async () => waitingRoom),
        countPlayers: vi.fn(async () => 4),
      },
    });

    await expect(
      service.joinRoom({
        room_code: 'ABCD1234',
        player_name: 'Siti',
      }),
    ).resolves.toEqual({
      room_id: 'room-1',
      status: 'full',
    });
  });

  it('adds a guest player when joining succeeds', async () => {
    const repository = {
      findByCode: vi.fn(async () => waitingRoom),
      countPlayers: vi.fn(async () => 1),
      addPlayer: vi.fn(async () => ({
        guest_id: 'guest-2',
        player_id: 'player-2',
      })),
    };
    const service = createService({ repository });

    await expect(
      service.joinRoom({
        room_code: 'ABCD1234',
        player_name: 'Siti',
      }),
    ).resolves.toEqual({
      room_id: 'room-1',
      status: 'success',
      guest_id: 'guest-2',
      player_id: 'player-2',
    });
    expect(repository.addPlayer).toHaveBeenCalledWith({
      roomId: 'room-1',
      playerName: 'Siti',
    });
  });

  it('throws not found when room code does not exist', async () => {
    const service = createService({
      repository: {
        findByCode: vi.fn(async () => null),
      },
    });

    await expect(
      service.joinRoom({
        room_code: 'MISSING',
        player_name: 'Siti',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws conflict after repeated room code collisions', async () => {
    const service = createService({
      repository: {
        roomCodeExists: vi.fn(async () => true),
      },
    });

    await expect(
      service.createRoom({
        host_nickname: 'Budi',
        room_name: 'Room Seru',
        max_players: 4,
        is_public: true,
        starting_money: 15000000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
