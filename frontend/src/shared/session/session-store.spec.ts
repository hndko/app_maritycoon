import { beforeEach, describe, expect, it } from 'vitest';
import { getRoomSession, saveRoomSession } from './session-store';

describe('room session store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists a session by room id', () => {
    saveRoomSession({
      guestId: 'guest-1',
      isHost: true,
      playerId: 'player-1',
      playerName: 'Budi',
      roomCode: 'ABCD1234',
      roomId: 'room-1',
      sessionToken: 'token-1',
    });

    expect(getRoomSession('room-1')?.playerName).toBe('Budi');
    expect(getRoomSession('ABCD1234')?.sessionToken).toBe('token-1');
  });
});
