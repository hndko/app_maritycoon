import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('allows local development defaults', () => {
    const config = validateEnvironment({
      NODE_ENV: 'development',
    });

    expect(config.port).toBe(4000);
    expect(config.sessionTokenSecret).toBe('dev-session-secret');
  });

  it('rejects weak production session secrets', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
        REDIS_URL: 'redis://:redis-password@localhost:6379',
        CORS_ORIGIN: 'https://maritycoon.example',
        PUBLIC_APP_URL: 'https://maritycoon.example',
        SESSION_TOKEN_SECRET: 'too-short',
        TRUST_PROXY: 'true',
      }),
    ).toThrow('SESSION_TOKEN_SECRET must be at least 32 characters in production');
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'not-a-url',
        REDIS_URL: 'redis://:redis-password@localhost:6379',
        CORS_ORIGIN: 'https://maritycoon.example',
        PUBLIC_APP_URL: 'https://maritycoon.example',
        SESSION_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
        TRUST_PROXY: 'true',
      }),
    ).toThrow('DATABASE_URL must be a valid URL');
  });

  it('rejects production redis without authentication', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:strong-pass@localhost:5432/app',
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGIN: 'https://maritycoon.example',
        PUBLIC_APP_URL: 'https://maritycoon.example',
        SESSION_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
        TRUST_PROXY: 'true',
      }),
    ).toThrow('REDIS_URL must include a password in production');
  });

  it('accepts hardened production configuration', () => {
    const config = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '4000',
      DATABASE_URL: 'postgresql://user:strong-pass@postgres:5432/app',
      REDIS_URL: 'redis://:redis-password@redis:6379',
      CORS_ORIGIN: 'https://maritycoon.example',
      PUBLIC_APP_URL: 'https://maritycoon.example',
      SESSION_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
      TRUST_PROXY: 'true',
      LOG_FORMAT: 'json',
    });

    expect(config.trustProxy).toBe(true);
    expect(config.logFormat).toBe('json');
  });
});
