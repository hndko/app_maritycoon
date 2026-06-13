import {
  BadRequestException,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { ChatMessageSocketDto } from './dto/chat-message-socket.dto';
import { JoinRoomSocketDto } from './dto/join-room-socket.dto';
import { PlayerActionSocketDto } from './dto/player-action-socket.dto';
import { PropertyActionSocketDto } from './dto/property-action-socket.dto';
import { ReadyStatusSocketDto } from './dto/ready-status-socket.dto';
import { RoomSettingsSocketDto } from './dto/room-settings-socket.dto';
import { RealtimeService } from './realtime.service';
import { socketRoomPrefix, SocketErrorPayload, SocketSession } from './realtime.types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RealtimeGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly turnTimers = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  server!: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  @SubscribeMessage('join_room')
  async joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const payload = this.validatePayload(JoinRoomSocketDto, body);
      const state = await this.realtimeService.joinRoom(socket.id, payload);
      const session: SocketSession = {
        socketId: socket.id,
        roomId: payload.room_id,
        playerId: payload.player_id,
        playerName: payload.user_nickname.trim(),
      };

      socket.data.session = session;
      await socket.join(this.roomName(payload.room_id));
      socket.emit('room_state_update', state);
      socket.to(this.roomName(payload.room_id)).emit('room_state_update', state);
      this.scheduleTurnTimeout(payload.room_id, state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('chat_message')
  async chatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(ChatMessageSocketDto, body);
      const broadcast = await this.realtimeService.createChatBroadcast(session, payload);

      this.server.to(this.roomName(session.roomId)).emit('chat_broadcast', broadcast);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('start_game')
  async startGame(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const { started, state } = await this.realtimeService.startGame(session);

      this.server.to(this.roomName(session.roomId)).emit('game_started', started);
      this.server.to(this.roomName(session.roomId)).emit('room_state_update', state);
      this.scheduleTurnTimeout(session.roomId, state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('set_ready')
  async setReady(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(ReadyStatusSocketDto, body);
      const result = await this.realtimeService.setReady(session, payload.is_ready);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('kick_player')
  async kickPlayer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PlayerActionSocketDto, body);
      const result = await this.realtimeService.kickPlayer(session, payload.player_id);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('transfer_host')
  async transferHost(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PlayerActionSocketDto, body);
      const result = await this.realtimeService.transferHost(session, payload.player_id);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('update_room_settings')
  async updateRoomSettings(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(RoomSettingsSocketDto, body);
      const result = await this.realtimeService.updateRoomSettings(session, payload);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('end_game')
  async endGame(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const result = await this.realtimeService.endGameByHost(session);
      const roomName = this.roomName(session.roomId);

      this.server.to(roomName).emit('game_finished', result.finished);
      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('roll_dice')
  async rollDice(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const result = await this.realtimeService.rollDice(session);
      const roomName = this.roomName(session.roomId);

      this.server.to(roomName).emit('dice_rolled_result', result.diceRolled);

      if (result.moved) {
        this.server.to(roomName).emit('player_moved', result.moved);
      }

      if (result.rentPaid) {
        this.server.to(roomName).emit('rent_paid', result.rentPaid);
      }

      if (result.bankrupt) {
        this.server.to(roomName).emit('player_bankrupt', result.bankrupt);
      }

      if (result.finished) {
        this.server.to(roomName).emit('game_finished', result.finished);
      }

      if (result.state.pending_action) {
        this.server.to(roomName).emit('action_required', result.state.pending_action);
      }

      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('buy_property')
  async buyProperty(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PropertyActionSocketDto, body);
      const result = await this.realtimeService.buyProperty(session, payload.property_id);
      const property = result.state.properties.find(
        (roomProperty) => roomProperty.property_id === payload.property_id,
      );
      const roomName = this.roomName(session.roomId);

      if (property) {
        this.server.to(roomName).emit('property_updated', property);
      }

      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('build_house')
  async buildHouse(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PropertyActionSocketDto, body);
      const result = await this.realtimeService.buildHouse(session, payload.property_id);
      const property = result.state.properties.find(
        (roomProperty) => roomProperty.property_id === payload.property_id,
      );
      const roomName = this.roomName(session.roomId);

      if (property) {
        this.server.to(roomName).emit('property_updated', property);
      }

      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('mortgage_property')
  async mortgageProperty(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PropertyActionSocketDto, body);
      const result = await this.realtimeService.mortgageProperty(session, payload.property_id);
      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('unmortgage_property')
  async unmortgageProperty(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PropertyActionSocketDto, body);
      const result = await this.realtimeService.unmortgageProperty(session, payload.property_id);
      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('declare_bankruptcy')
  async declareBankruptcy(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const result = await this.realtimeService.declareBankruptcy(session);
      const roomName = this.roomName(session.roomId);

      this.server.to(roomName).emit('player_bankrupt', result.bankrupt);

      if (result.finished) {
        this.server.to(roomName).emit('game_finished', result.finished);
      }

      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('pay_jail_fine')
  async payJailFine(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const result = await this.realtimeService.payJailFine(session);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('use_jail_card')
  async useJailCard(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const result = await this.realtimeService.useJailCard(session);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('sell_building')
  async sellBuilding(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    try {
      const session = this.getSession(socket);
      const payload = this.validatePayload(PropertyActionSocketDto, body);
      const result = await this.realtimeService.sellBuilding(session, payload.property_id);

      this.server.to(this.roomName(session.roomId)).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  @SubscribeMessage('end_turn')
  async endTurn(@ConnectedSocket() socket: Socket): Promise<void> {
    try {
      const session = this.getSession(socket);
      const result = await this.realtimeService.endTurn(session);
      const roomName = this.roomName(session.roomId);

      this.server.to(roomName).emit('turn_changed', result.turnChanged);
      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(session.roomId, result.state);
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const result = await this.realtimeService.disconnect(socket.id);

    if (!result) {
      return;
    }

    try {
      const roomName = this.roomName(result.session.roomId);

      if (result.turnChanged) {
        this.server.to(roomName).emit('turn_changed', result.turnChanged);
      }

      this.server.to(roomName).emit('room_state_update', result.state);
      this.scheduleTurnTimeout(result.session.roomId, result.state);
    } catch (error) {
      this.logger.warn(`Failed to broadcast disconnect state: ${String(error)}`);
    }
  }

  private getSession(socket: Socket): SocketSession {
    const session = socket.data.session as SocketSession | undefined;

    if (!session) {
      throw new BadRequestException('Socket has not joined a room');
    }

    return session;
  }

  private validatePayload<T extends object>(
    dto: new () => T,
    body: unknown,
  ): T {
    const payload = plainToInstance(dto, body);
    const errors = validateSync(payload, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException('Invalid socket payload');
    }

    return payload;
  }

  private roomName(roomId: string): string {
    return `${socketRoomPrefix}${roomId}`;
  }

  private emitError(socket: Socket, error: unknown): void {
    const payload: SocketErrorPayload = {
      message: error instanceof Error ? error.message : 'Unexpected socket error',
    };

    socket.emit('error', payload);
  }

  private scheduleTurnTimeout(
    roomId: string,
    state: { status: string; turn?: { deadline_at: string | null; phase: string } },
  ): void {
    const existing = this.turnTimers.get(roomId);

    if (existing) {
      clearTimeout(existing);
      this.turnTimers.delete(roomId);
    }

    if (state.status !== 'playing' || !state.turn?.deadline_at || state.turn.phase === 'finished') {
      return;
    }

    const delay = Math.max(0, Date.parse(state.turn.deadline_at) - Date.now());
    const timer = setTimeout(() => {
      void this.handleTurnTimeout(roomId);
    }, delay);

    this.turnTimers.set(roomId, timer);
  }

  private async handleTurnTimeout(roomId: string): Promise<void> {
    try {
      const turnChanged = await this.realtimeService.expireTurnIfOverdue(roomId);
      const state = await this.realtimeService.getRoomState(roomId);
      const roomName = this.roomName(roomId);

      if (turnChanged) {
        this.server.to(roomName).emit('turn_changed', turnChanged);
      }

      this.server.to(roomName).emit('room_state_update', state);
      this.scheduleTurnTimeout(roomId, state);
    } catch (error) {
      this.logger.warn(`Failed to process turn timeout: ${String(error)}`);
    }
  }
}
