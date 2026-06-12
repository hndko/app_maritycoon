import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameRepository } from '../game/game.repository';
import { RoomPlayerRecord, RoomsRepository } from '../rooms/rooms.repository';
import { ChatMessageSocketDto } from './dto/chat-message-socket.dto';
import { JoinRoomSocketDto } from './dto/join-room-socket.dto';
import { RealtimeStateStore } from './realtime-state.store';
import {
  ChatBroadcastPayload,
  GameStartedPayload,
  RealtimePlayer,
  RoomStatePayload,
  SocketSession,
} from './realtime.types';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly gameRepository: GameRepository,
    private readonly stateStore: RealtimeStateStore,
  ) {}

  async joinRoom(socketId: string, input: JoinRoomSocketDto): Promise<RoomStatePayload> {
    const room = await this.roomsRepository.findById(input.room_id);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const player = await this.roomsRepository.findPlayerInRoom(
      input.room_id,
      input.player_id,
    );

    if (!player) {
      throw new ForbiddenException('Player is not part of this room');
    }

    if (player.player_name !== input.user_nickname.trim()) {
      throw new BadRequestException('Player nickname does not match room slot');
    }

    await this.stateStore.markConnected(input.room_id, input.player_id, socketId);
    return this.getRoomState(input.room_id);
  }

  async disconnect(socketId: string): Promise<SocketSession | null> {
    const session = await this.stateStore.getSocketSession(socketId);

    if (!session) {
      return null;
    }

    const player = await this.roomsRepository.findPlayerInRoom(
      session.roomId,
      session.playerId,
    );

    await this.stateStore.clearSocketSession(socketId);
    await this.stateStore.markDisconnected(session.roomId, session.playerId);

    return {
      socketId,
      roomId: session.roomId,
      playerId: session.playerId,
      playerName: player?.player_name ?? 'Unknown Player',
    };
  }

  async createChatBroadcast(
    session: SocketSession,
    input: ChatMessageSocketDto,
  ): Promise<ChatBroadcastPayload> {
    const isAllowed = await this.stateStore.assertChatAllowed(
      session.roomId,
      session.playerId,
    );

    if (!isAllowed) {
      throw new HttpException('Chat rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    const payload: ChatBroadcastPayload = {
      room_id: session.roomId,
      sender_name: session.playerName,
      message: input.message.trim(),
      type: 'user',
      timestamp: new Date().toISOString(),
    };

    await this.gameRepository.appendLog(session.roomId, 'chat_message', payload);
    return payload;
  }

  async startGame(session: SocketSession): Promise<{
    started: GameStartedPayload;
    state: RoomStatePayload;
  }> {
    const room = await this.roomsRepository.findById(session.roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new ConflictException('Game can only be started from waiting room');
    }

    const players = await this.roomsRepository.listPlayers(session.roomId);
    const actor = players.find((player) => player.id === session.playerId);

    if (!actor?.is_host) {
      throw new ForbiddenException('Only host can start the game');
    }

    if (players.length < 2) {
      throw new ConflictException('At least two players are required to start');
    }

    const started = await this.roomsRepository.startGame(
      session.roomId,
      room.starting_money,
    );
    const payload: GameStartedPayload = {
      room_id: session.roomId,
      first_turn_player_id: started.first_turn_player_id,
    };

    await this.gameRepository.appendLog(session.roomId, 'game_started', payload);

    return {
      started: payload,
      state: await this.getRoomState(session.roomId, started.players),
    };
  }

  async getRoomState(
    roomId: string,
    knownPlayers?: RoomPlayerRecord[],
  ): Promise<RoomStatePayload> {
    const room = await this.roomsRepository.findById(roomId);

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const players = knownPlayers ?? (await this.roomsRepository.listPlayers(roomId));
    const realtimePlayers = await Promise.all(
      players.map(async (player) => {
        const connection = await this.stateStore.getConnection(roomId, player.id);
        return {
          ...player,
          is_connected: connection.is_connected,
          disconnected_at: connection.disconnected_at,
        } satisfies RealtimePlayer;
      }),
    );
    const currentTurnPlayer =
      realtimePlayers
        .filter((player) => player.turn_order !== null)
        .sort((left, right) => Number(left.turn_order) - Number(right.turn_order))[0] ??
      null;

    return {
      room_id: room.id,
      room_code: room.room_code,
      room_name: room.room_name,
      status: room.status,
      visibility: room.visibility,
      max_players: room.max_players,
      starting_money: room.starting_money,
      turn_timer_seconds: room.turn_timer_seconds,
      state_version: await this.stateStore.nextStateVersion(roomId),
      players: realtimePlayers,
      current_turn_player_id: currentTurnPlayer?.id ?? null,
    };
  }
}
