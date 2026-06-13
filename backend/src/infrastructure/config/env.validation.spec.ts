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
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGIN: 'https://maritycoon.example',
        SESSION_TOKEN_SECRET: 'too-short',
      }),
    ).toThrow('SESSION_TOKEN_SECRET must be at least 32 characters in production');
  });

  it('rejects invalid URLs', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'not-a-url',
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGIN: 'https://maritycoon.example',
        SESSION_TOKEN_SECRET: '0123456789abcdef0123456789abcdef',
      }),
    ).toThrow('DATABASE_URL must be a valid URL');
  });
});
