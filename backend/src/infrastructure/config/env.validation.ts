const defaultCorsOrigin = 'http://localhost:3000';
const defaultPort = 4000;
const defaultSessionSecret = 'dev-session-secret';
const defaultPublicAppUrl = 'http://localhost:3000';

export type RuntimeConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigin: string;
  publicAppUrl: string;
  databaseUrl: string;
  redisUrl: string;
  sessionTokenSecret: string;
  trustProxy: boolean;
  logFormat: 'pretty' | 'json';
};

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const databaseUrl = env.DATABASE_URL ?? 'postgres://maritycoon:maritycoon@localhost:5432/maritycoon';
  const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';
  const corsOrigin = env.CORS_ORIGIN ?? defaultCorsOrigin;
  const publicAppUrl = env.PUBLIC_APP_URL ?? defaultPublicAppUrl;
  const sessionTokenSecret = env.SESSION_TOKEN_SECRET ?? defaultSessionSecret;
  const trustProxy = env.TRUST_PROXY === 'true';
  const logFormat = env.LOG_FORMAT === 'json' ? 'json' : 'pretty';
  const port = Number(env.PORT ?? defaultPort);
  const errors: string[] = [];

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535');
  }

  validateUrl('DATABASE_URL', databaseUrl, errors);
  validateUrl('REDIS_URL', redisUrl, errors);
  validateUrl('CORS_ORIGIN', corsOrigin, errors);
  validateUrl('PUBLIC_APP_URL', publicAppUrl, errors);

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

    validateProductionUrl('CORS_ORIGIN', corsOrigin, errors);
    validateProductionUrl('PUBLIC_APP_URL', publicAppUrl, errors);
    validateProductionDatabase(databaseUrl, errors);
    validateProductionRedis(redisUrl, env.REDIS_ALLOW_NO_AUTH === 'true', errors);

    if (!trustProxy) {
      errors.push('TRUST_PROXY=true is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${errors.join('; ')}`);
  }

  return {
    nodeEnv,
    port,
    corsOrigin,
    publicAppUrl,
    databaseUrl,
    redisUrl,
    sessionTokenSecret,
    trustProxy,
    logFormat,
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

function validateProductionUrl(name: string, value: string, errors: string[]): void {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') {
      errors.push(`${name} must use https in production`);
    }
  } catch {
    // validateUrl already reports invalid URLs.
  }
}

function validateProductionDatabase(value: string, errors: string[]): void {
  try {
    const url = new URL(value);

    if (url.password === 'maritycoon') {
      errors.push('DATABASE_URL must not use the default production password');
    }
  } catch {
    // validateUrl already reports invalid URLs.
  }
}

function validateProductionRedis(value: string, allowNoAuth: boolean, errors: string[]): void {
  try {
    const url = new URL(value);

    if (!url.password && !allowNoAuth) {
      errors.push('REDIS_URL must include a password in production');
    }
  } catch {
    // validateUrl already reports invalid URLs.
  }
}
