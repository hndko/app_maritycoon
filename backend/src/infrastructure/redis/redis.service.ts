import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { Redis as RedisClient } from 'ioredis';
import { getRedisUrl } from './redis.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisUrl = getRedisUrl();
  private readonly client = new Redis(getRedisUrl(), {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  private readonly duplicateClients = new Set<RedisClient>();

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.ensureConnected();

    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(key);
  }

  async ping(): Promise<string> {
    await this.ensureConnected();
    return this.client.ping();
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    await this.ensureConnected();
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return count;
  }

  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    await this.ensureConnected();
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  async acquireLock(key: string, owner: string, ttlMilliseconds: number): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.set(key, owner, 'PX', ttlMilliseconds, 'NX');
    return result === 'OK';
  }

  createDuplicateClient(): RedisClient {
    const duplicate = new Redis(this.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    this.duplicateClients.add(duplicate);
    return duplicate;
  }

  async onModuleDestroy(): Promise<void> {
    for (const duplicate of this.duplicateClients) {
      duplicate.disconnect();
    }

    this.client.disconnect();
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }
}
