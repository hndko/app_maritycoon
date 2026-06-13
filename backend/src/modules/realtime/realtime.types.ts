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
  is_in_jail?: boolean;
  jail_turns?: number;
  get_out_of_jail_cards?: number;
};

export type DiceState = {
  dice_1: number;
  dice_2: number;
  total: number;
  is_double: boolean;
  rolled_at: string;
} | null;

export type TurnPhase =
  | 'waiting'
  | 'await_roll'
  | 'await_action'
  | 'free_action'
  | 'bankruptcy_resolution'
  | 'finished';

export type PendingAction =
  | {
      type: 'buy_property';
      player_id: string;
      property_id: number;
      price: number;
    }
  | {
      type: 'jail_decision';
      player_id: string;
    }
  | {
      type: 'bankruptcy_resolution';
      player_id: string;
      creditor_id: string | null;
      amount: number;
      reason: string;
    }
  | null;

export type GameplayState = {
  current_player_id: string | null;
  phase: TurnPhase;
  double_count: number;
  dice: DiceState;
  pending_action: PendingAction;
  jailed_player_ids: string[];
  winner_id: string | null;
  jail_turns_by_player_id?: Record<string, number>;
  jail_free_card_player_ids?: string[];
  chance_deck?: string[];
  community_chest_deck?: string[];
  last_card?: CardDrawPayload | null;
  turn_started_at?: string | null;
  turn_deadline_at?: string | null;
};

export type CardDrawPayload = {
  deck: 'chance' | 'community_chest';
  card_id: string;
  title: string;
  description: string;
};

export type GameLogPayload = {
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type RealtimeRoomProperty = {
  property_id: number;
  owner_id: string | null;
  house_count: number;
  hotel_count: number;
  is_mortgaged: boolean;
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
  properties: RealtimeRoomProperty[];
  turn: {
      current_player_id: string | null;
      phase: TurnPhase;
      double_count: number;
      deadline_at: string | null;
  };
  dice: DiceState;
  pending_action: PendingAction;
  winner_id: string | null;
  last_card: CardDrawPayload | null;
  game_logs: GameLogPayload[];
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

export type DiceRolledPayload = {
  player_id: string;
  dice_1: number;
  dice_2: number;
  total: number;
  is_double: boolean;
};

export type PlayerMovedPayload = {
  player_id: string;
  old_position: number;
  new_position: number;
  passed_start: boolean;
};

export type PropertyUpdatedPayload = RealtimeRoomProperty;

export type RentPaidPayload = {
  payer_id: string;
  owner_id: string;
  property_id: number;
  amount: number;
};

export type TurnChangedPayload = {
  next_player_id: string | null;
};

export type PlayerBankruptPayload = {
  player_id: string;
};

export type GameFinishedPayload = {
  winner_id: string;
  leaderboard: Array<{
    player_id: string;
    player_name: string;
    money: number;
    is_bankrupt: boolean;
  }>;
};
