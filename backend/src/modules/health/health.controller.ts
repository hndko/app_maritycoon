import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

type HealthResponse = {
  status: 'ok' | 'degraded';
  service: 'maritycoon-backend';
  dependencies: {
    postgres: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
};

@Controller('health')
export class HealthController {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthResponse> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    return {
      status: postgres === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      service: 'maritycoon-backend',
      dependencies: {
        postgres,
        redis,
      },
    };
  }

  private async checkPostgres(): Promise<'ok' | 'error'> {
    try {
      await this.database.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    try {
      return (await this.redis.ping()) === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}
