export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type RoomVisibility = 'public' | 'private' | 'invite_only';

export type PublicRoom = {
  room_id: string;
  room_name: string;
  room_code: string;
  current_players: number;
  max_players: number;
  host_name: string;
  status: RoomStatus;
};

export type RoomPlayer = {
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
  joined_at: string;
  is_connected?: boolean;
  disconnected_at?: string | null;
};

export type RoomDetail = {
  room_id: string;
  room_code: string;
  room_name: string;
  is_public: boolean;
  visibility: RoomVisibility;
  max_players: number;
  starting_money: number;
  turn_timer_seconds: number;
  status: RoomStatus;
  players: RoomPlayer[];
};

export type PropertyTile = {
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

export type CreateRoomInput = {
  host_nickname: string;
  room_name: string;
  max_players: number;
  is_public: boolean;
  visibility?: RoomVisibility;
  password?: string;
  starting_money: number;
  turn_timer_seconds?: number;
};

export type CreateRoomResponse = {
  room_id: string;
  room_code: string;
  share_url: string;
  guest_id: string;
  player_id: string;
};

export type JoinRoomInput = {
  room_code: string;
  player_name: string;
  password?: string;
};

export type JoinRoomResponse =
  | {
      room_id: string;
      status: 'need_password';
    }
  | {
      room_id: string;
      status: 'full';
    }
  | {
      room_id: string;
      status: 'success';
      guest_id: string;
      player_id: string;
    };

export type RealtimeRoomState = {
  room_id: string;
  room_code: string;
  room_name: string;
  status: RoomStatus;
  visibility: RoomVisibility;
  max_players: number;
  starting_money: number;
  turn_timer_seconds: number;
  state_version: number;
  players: RoomPlayer[];
  current_turn_player_id: string | null;
};

export type ChatMessage = {
  room_id: string;
  sender_name: string;
  message: string;
  type: 'user' | 'system';
  timestamp: string;
};

export type GameStartedEvent = {
  room_id: string;
  first_turn_player_id: string;
};
