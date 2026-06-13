import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { GameplayState } from './realtime.types';

const reconnectTtlSeconds = 5 * 60;
const chatWindowSeconds = 10;
const maxChatMessagesPerWindow = 5;
const actionWindowSeconds = 5;
const maxActionsPerWindow = 10;
const gameplayStateTtlSeconds = 60 * 60 * 24;
const turnLockTtlMilliseconds = 15_000;

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
    await this.bumpStateVersion(roomId);
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
    await this.bumpStateVersion(roomId);
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

  async getStateVersion(roomId: string): Promise<number> {
    const raw = await this.redisService.get(this.stateVersionKey(roomId));
    return Number(raw ?? 0);
  }

  async bumpStateVersion(roomId: string): Promise<number> {
    return this.redisService.incr(this.stateVersionKey(roomId), 60 * 60 * 24);
  }

  async assertChatAllowed(roomId: string, playerId: string): Promise<boolean> {
    const count = await this.redisService.incr(
      this.chatRateKey(roomId, playerId),
      chatWindowSeconds,
    );

    return count <= maxChatMessagesPerWindow;
  }

  async assertActionAllowed(roomId: string, playerId: string, action: string): Promise<boolean> {
    const count = await this.redisService.incr(
      this.actionRateKey(roomId, playerId, action),
      actionWindowSeconds,
    );

    return count <= maxActionsPerWindow;
  }

  async getGameplayState(roomId: string): Promise<GameplayState | null> {
    const raw = await this.redisService.get(this.gameplayStateKey(roomId));
    return raw ? (JSON.parse(raw) as GameplayState) : null;
  }

  async setGameplayState(roomId: string, state: GameplayState): Promise<void> {
    await this.redisService.set(
      this.gameplayStateKey(roomId),
      JSON.stringify(state),
      gameplayStateTtlSeconds,
    );
    await this.bumpStateVersion(roomId);
  }

  async listGameplayRoomIds(): Promise<string[]> {
    const keys = await this.redisService.scanKeys('room:*:gameplay_state');

    return keys
      .map((key) => key.match(/^room:(.+):gameplay_state$/)?.[1])
      .filter((roomId): roomId is string => Boolean(roomId));
  }

  async acquireTurnTimerLock(roomId: string, owner: string): Promise<boolean> {
    return this.redisService.acquireLock(
      this.turnTimerLockKey(roomId),
      owner,
      turnLockTtlMilliseconds,
    );
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

  private actionRateKey(roomId: string, playerId: string, action: string): string {
    return `room:${roomId}:player:${playerId}:action:${action}`;
  }

  private gameplayStateKey(roomId: string): string {
    return `room:${roomId}:gameplay_state`;
  }

  private turnTimerLockKey(roomId: string): string {
    return `room:${roomId}:turn_timer_lock`;
  }
}
