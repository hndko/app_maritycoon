import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getRedisUrl } from './redis.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(getRedisUrl(), {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

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

  async incr(key: string, ttlSeconds: number): Promise<number> {
    await this.ensureConnected();
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return count;
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }
}
