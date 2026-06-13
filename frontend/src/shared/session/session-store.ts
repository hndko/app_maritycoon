export type RoomSession = {
  roomId: string;
  roomCode: string;
  guestId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  sessionToken: string;
};

const sessionKey = 'maritycoon:room-sessions';

function readSessions(): Record<string, RoomSession> {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.localStorage.getItem(sessionKey);

  if (!raw) {
    return {};
  }

  return JSON.parse(raw) as Record<string, RoomSession>;
}

export function getRoomSession(roomId: string): RoomSession | null {
  return readSessions()[roomId] ?? null;
}

export function saveRoomSession(session: RoomSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  const sessions = readSessions();
  sessions[session.roomId] = session;
  sessions[session.roomCode] = session;
  window.localStorage.setItem(sessionKey, JSON.stringify(sessions));
}
