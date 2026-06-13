import { describe, expect, it } from 'vitest';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RealtimeStateStore } from './realtime-state.store';

class MemoryRedisService {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }

  async incr(key: string): Promise<number> {
    const nextValue = Number(this.values.get(key) ?? 0) + 1;
    this.values.set(key, String(nextValue));
    return nextValue;
  }

  async scanKeys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.replaceAll('*', '.*')}$`);
    return [...this.values.keys()].filter((key) => regex.test(key));
  }

  async acquireLock(key: string, owner: string): Promise<boolean> {
    if (this.values.has(key)) {
      return false;
    }

    this.values.set(key, owner);
    return true;
  }
}

describe('RealtimeStateStore hardening primitives', () => {
  it('lists active gameplay rooms from Redis keys', async () => {
    const store = new RealtimeStateStore(new MemoryRedisService() as unknown as RedisService);

    await store.setGameplayState('room-a', {
      current_player_id: 'player-a',
      phase: 'await_roll',
      double_count: 0,
      dice: null,
      pending_action: null,
      jailed_player_ids: [],
      winner_id: null,
      jail_turns_by_player_id: {},
      jail_free_card_player_ids: [],
      chance_deck: [],
      community_chest_deck: [],
      last_card: null,
      turn_started_at: new Date().toISOString(),
      turn_deadline_at: new Date(Date.now() + 60_000).toISOString(),
    });

    await expect(store.listGameplayRoomIds()).resolves.toEqual(['room-a']);
  });

  it('allows only one timer lock owner at a time', async () => {
    const store = new RealtimeStateStore(new MemoryRedisService() as unknown as RedisService);

    await expect(store.acquireTurnTimerLock('room-a', 'instance-a')).resolves.toBe(true);
    await expect(store.acquireTurnTimerLock('room-a', 'instance-b')).resolves.toBe(false);
  });
});
