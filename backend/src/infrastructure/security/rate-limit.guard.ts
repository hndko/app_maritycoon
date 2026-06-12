import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const now = Date.now();
    const key = this.getKey(request);
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
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const method = request.method ?? 'GET';
    const url = request.originalUrl ?? request.url ?? '/';

    return `${ip}:${method}:${url}`;
  }
}
