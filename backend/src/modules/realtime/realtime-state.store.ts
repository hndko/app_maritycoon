import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';

const reconnectTtlSeconds = 5 * 60;
const chatWindowSeconds = 10;
const maxChatMessagesPerWindow = 5;

export type PlayerConnectionState = {
  is_connected: boolean;
  disconnected_at: string | null;
};

@Injectable()
export class RealtimeStateStore {
  constructor(private readonly redisService: RedisService) {}

  async markConnected(roomId: string, playerId: string, socketId: string): Promise<void> {
    await this.redisService.set(this.socketKey(socketId), JSON.stringify({ roomId, playerId }));
    await this.redisService.set(
      this.playerConnectionKey(roomId, playerId),
      JSON.stringify({
        is_connected: true,
        disconnected_at: null,
      } satisfies PlayerConnectionState),
    );
  }

  async markDisconnected(roomId: string, playerId: string): Promise<void> {
    await this.redisService.set(
      this.playerConnectionKey(roomId, playerId),
      JSON.stringify({
        is_connected: false,
        disconnected_at: new Date().toISOString(),
      } satisfies PlayerConnectionState),
      reconnectTtlSeconds,
    );
  }

  async getConnection(roomId: string, playerId: string): Promise<PlayerConnectionState> {
    const raw = await this.redisService.get(this.playerConnectionKey(roomId, playerId));

    if (!raw) {
      return {
        is_connected: false,
        disconnected_at: null,
      };
    }

    return JSON.parse(raw) as PlayerConnectionState;
  }

  async getSocketSession(socketId: string): Promise<{ roomId: string; playerId: string } | null> {
    const raw = await this.redisService.get(this.socketKey(socketId));
    return raw ? (JSON.parse(raw) as { roomId: string; playerId: string }) : null;
  }

  async clearSocketSession(socketId: string): Promise<void> {
    await this.redisService.del(this.socketKey(socketId));
  }

  async nextStateVersion(roomId: string): Promise<number> {
    return this.redisService.incr(this.stateVersionKey(roomId), 60 * 60 * 24);
  }

  async assertChatAllowed(roomId: string, playerId: string): Promise<boolean> {
    const count = await this.redisService.incr(
      this.chatRateKey(roomId, playerId),
      chatWindowSeconds,
    );

    return count <= maxChatMessagesPerWindow;
  }

  private socketKey(socketId: string): string {
    return `socket:${socketId}`;
  }

  private playerConnectionKey(roomId: string, playerId: string): string {
    return `room:${roomId}:player:${playerId}:connection`;
  }

  private stateVersionKey(roomId: string): string {
    return `room:${roomId}:state_version`;
  }

  private chatRateKey(roomId: string, playerId: string): string {
    return `room:${roomId}:player:${playerId}:chat_rate`;
  }
}
