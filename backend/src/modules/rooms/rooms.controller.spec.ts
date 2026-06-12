import { describe, expect, it, vi } from 'vitest';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  it('delegates create room requests to the room service', async () => {
    const service = {
      createRoom: vi.fn(async () => ({
        room_id: 'room-1',
        room_code: 'ABCD1234',
        share_url: 'http://localhost:3000/room/ABCD1234',
        guest_id: 'guest-1',
        player_id: 'player-1',
      })),
    } as unknown as RoomsService;
    const controller = new RoomsController(service);

    await expect(
      controller.createRoom({
        host_nickname: 'Budi',
        room_name: 'Room Seru',
        max_players: 4,
        is_public: true,
        starting_money: 15000000,
      }),
    ).resolves.toEqual({
      room_id: 'room-1',
      room_code: 'ABCD1234',
      share_url: 'http://localhost:3000/room/ABCD1234',
      guest_id: 'guest-1',
      player_id: 'player-1',
    });
  });

  it('delegates join room requests to the room service', async () => {
    const service = {
      joinRoom: vi.fn(async () => ({
        room_id: 'room-1',
        status: 'success',
        guest_id: 'guest-2',
        player_id: 'player-2',
      })),
    } as unknown as RoomsService;
    const controller = new RoomsController(service);

    await expect(
      controller.joinRoom({
        room_code: 'ABCD1234',
        player_name: 'Siti',
      }),
    ).resolves.toEqual({
      room_id: 'room-1',
      status: 'success',
      guest_id: 'guest-2',
      player_id: 'player-2',
    });
  });
});
