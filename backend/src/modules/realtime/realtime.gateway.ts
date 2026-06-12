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
    } catch (error) {
      this.emitError(socket, error);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const session = await this.realtimeService.disconnect(socket.id);

    if (!session) {
      return;
    }

    try {
      const state = await this.realtimeService.getRoomState(session.roomId);
      this.server.to(this.roomName(session.roomId)).emit('room_state_update', state);
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
}
