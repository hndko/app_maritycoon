import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

type HttpRequest = {
  ip?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
  socket?: {
    remoteAddress?: string;
  };
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const windowMs = 60_000;
const maxRequests = 120;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(@Optional() private readonly redis?: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpRequest>();

    if (this.isHealthCheck(request)) {
      return true;
    }

    const key = this.getKey(request);

    if (this.redis) {
      try {
        const count = await this.redis.incr(`http_rate:${key}`, windowMs / 1000);

        if (count > maxRequests) {
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        }

        return true;
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
      }
    }

    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    bucket.count += 1;

    if (bucket.count > maxRequests) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getKey(request: HttpRequest): string {
    const forwardedFor = this.getForwardedFor(request);
    const ip = forwardedFor ?? request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const method = request.method ?? 'GET';
    const url = request.originalUrl ?? request.url ?? '/';

    return `${ip}:${method}:${url}`;
  }

  private getForwardedFor(request: HttpRequest): string | undefined {
    const headers = (request as { headers?: Record<string, string | string[] | undefined> }).headers;
    const forwardedFor = headers?.['x-forwarded-for'];

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0]?.split(',')[0]?.trim();
    }

    return forwardedFor?.split(',')[0]?.trim();
  }

  private isHealthCheck(request: HttpRequest): boolean {
    const url = request.originalUrl ?? request.url ?? '';
    return url === '/api/health' || url === '/health';
  }
}
