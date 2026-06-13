const defaultCorsOrigin = 'http://localhost:3000';
const defaultPort = 4000;
const defaultSessionSecret = 'dev-session-secret';

export type RuntimeConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  sessionTokenSecret: string;
};

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const databaseUrl = env.DATABASE_URL ?? 'postgres://maritycoon:maritycoon@localhost:5432/maritycoon';
  const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';
  const corsOrigin = env.CORS_ORIGIN ?? defaultCorsOrigin;
  const sessionTokenSecret = env.SESSION_TOKEN_SECRET ?? defaultSessionSecret;
  const port = Number(env.PORT ?? defaultPort);
  const errors: string[] = [];

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535');
  }

  validateUrl('DATABASE_URL', databaseUrl, errors);
  validateUrl('REDIS_URL', redisUrl, errors);
  validateUrl('CORS_ORIGIN', corsOrigin, errors);

  if (nodeEnv === 'production') {
    if (!env.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }

    if (!env.REDIS_URL) {
      errors.push('REDIS_URL is required in production');
    }

    if (!env.CORS_ORIGIN) {
      errors.push('CORS_ORIGIN is required in production');
    }

    if (!env.SESSION_TOKEN_SECRET) {
      errors.push('SESSION_TOKEN_SECRET is required in production');
    }

    if (sessionTokenSecret === defaultSessionSecret || sessionTokenSecret.length < 32) {
      errors.push('SESSION_TOKEN_SECRET must be at least 32 characters in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${errors.join('; ')}`);
  }

  return {
    nodeEnv,
    port,
    corsOrigin,
    databaseUrl,
    redisUrl,
    sessionTokenSecret,
  };
}

export function getSessionTokenSecret(): string {
  return validateEnvironment().sessionTokenSecret;
}

function normalizeNodeEnv(value: string | undefined): RuntimeConfig['nodeEnv'] {
  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

function validateUrl(name: string, value: string, errors: string[]): void {
  try {
    new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}
