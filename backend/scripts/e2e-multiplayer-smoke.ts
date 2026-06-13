import { io } from 'socket.io-client';

type CreateRoomResponse = {
  room_id: string;
  room_code: string;
  player_id: string;
  session_token: string;
};

type JoinRoomResponse = {
  room_id: string;
  player_id: string;
  session_token: string;
  status: 'success';
};

const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';

async function main(): Promise<void> {
  const room = await post<CreateRoomResponse>('/api/rooms', {
    host_nickname: 'Host Smoke',
    room_name: `Smoke ${Date.now()}`,
    max_players: 2,
    is_public: true,
    visibility: 'public',
    starting_money: 15000000,
    turn_timer_seconds: 60,
  });

  const join = await post<JoinRoomResponse>('/api/rooms/join', {
    room_code: room.room_code,
    player_name: 'Player Smoke',
  });

  await Promise.all([
    connectAndJoin(room.room_id, room.player_id, 'Host Smoke', room.session_token),
    connectAndJoin(join.room_id, join.player_id, 'Player Smoke', join.session_token),
  ]);

  console.log('multiplayer smoke passed');
}

async function connectAndJoin(
  roomId: string,
  playerId: string,
  userNickname: string,
  sessionToken: string,
): Promise<void> {
  const socket = io(backendUrl, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });

  try {
    await once(socket, 'connect');
    socket.emit('join_room', {
      room_id: roomId,
      player_id: playerId,
      user_nickname: userNickname,
      session_token: sessionToken,
    });
    await once(socket, 'room_state_update');
  } finally {
    socket.disconnect();
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

function once(socket: ReturnType<typeof io>, event: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);

    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    socket.once('connect_error', reject);
    socket.once('error', reject);
  });
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
