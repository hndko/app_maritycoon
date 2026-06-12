import { RoomPlayerRecord, RoomStatus, RoomVisibility } from '../rooms/rooms.repository';

export const socketRoomPrefix = 'room:';

export type SocketSession = {
  socketId: string;
  roomId: string;
  playerId: string;
  playerName: string;
};

export type RealtimePlayer = RoomPlayerRecord & {
  is_connected: boolean;
  disconnected_at: string | null;
};

export type RoomStatePayload = {
  room_id: string;
  room_code: string;
  room_name: string;
  status: RoomStatus;
  visibility: RoomVisibility;
  max_players: number;
  starting_money: number;
  turn_timer_seconds: number;
  state_version: number;
  players: RealtimePlayer[];
  current_turn_player_id: string | null;
};

export type ChatBroadcastPayload = {
  room_id: string;
  sender_name: string;
  message: string;
  type: 'user' | 'system';
  timestamp: string;
};

export type GameStartedPayload = {
  room_id: string;
  first_turn_player_id: string;
};

export type SocketErrorPayload = {
  message: string;
};
