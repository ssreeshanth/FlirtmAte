import { randomBytes } from 'node:crypto';
import { isAbsolute } from 'node:path';

const integer = (name, value, defaultValue, { min = 0 } = {}) => {
  const raw = value === undefined || value === '' ? defaultValue : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min) throw new Error(`${name} must be an integer >= ${min}`);
  return parsed;
};

export function loadConfig(env = {}) {
  const nodeEnv = env.NODE_ENV || 'development';
  const provider = env.AI_PROVIDER || 'openai';
  if (!['openai', 'gemini'].includes(provider)) throw new Error('AI_PROVIDER must be openai or gemini');
  const keyName = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
  const modelName = provider === 'openai' ? 'OPENAI_MODEL' : 'GEMINI_MODEL';
  if (!env[keyName]) throw new Error(`${keyName} is required when AI_PROVIDER=${provider}`);
  if (!env[modelName]) throw new Error(`${modelName} is required when AI_PROVIDER=${provider}`);
  if (nodeEnv === 'production' && /^(replace-|paste-|your-)/i.test(env[keyName])) throw new Error(`${keyName} must be a real provider key in production`);
  if (nodeEnv === 'production' && /^(replace-|paste-|your-)/i.test(env[modelName])) throw new Error(`${modelName} must be set to a real model in production`);
  if (nodeEnv === 'production' && (!env.DB_PATH || env.DB_PATH === ':memory:' || !isAbsolute(env.DB_PATH))) throw new Error('DB_PATH must point to an absolute persistent database path in production');

  let temperature = env.AI_TEMPERATURE === 'off' ? 'off' : Number(env.AI_TEMPERATURE ?? 1);
  if (temperature !== 'off' && (!Number.isFinite(temperature) || temperature < 0 || temperature > 2)) {
    throw new Error('AI_TEMPERATURE must be off or a number from 0 to 2');
  }
  const sessionSecret = env.SESSION_SECRET || (nodeEnv === 'production' ? '' : randomBytes(32).toString('base64url'));
  if (nodeEnv === 'production' && (Buffer.byteLength(sessionSecret) < 32 || /^(generate-|replace-|your-)/i.test(sessionSecret))) throw new Error('SESSION_SECRET must be a generated secret of at least 32 bytes in production');
  const privacyContactEmail = env.PRIVACY_CONTACT_EMAIL || '';
  if (nodeEnv === 'production' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyContactEmail) || /@(example\.(com|test|org|net)|invalid)$/i.test(privacyContactEmail))) throw new Error('PRIVACY_CONTACT_EMAIL must be set to a real operator contact email in production');
  const config = {
    port: integer('PORT', env.PORT, 3001, { min: 1 }),
    dbPath: env.DB_PATH || './data/flirtmate.db',
    provider,
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_MODEL || '',
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || '',
    temperature,
    aiTimeoutMs: integer('AI_TIMEOUT_MS', env.AI_TIMEOUT_MS, 25000, { min: 1 }),
    aiTotalTimeoutMs: integer('AI_TOTAL_TIMEOUT_MS', env.AI_TOTAL_TIMEOUT_MS, 60000, { min: 1 }),
    rateLimitPerMin: integer('RATE_LIMIT_PER_MIN', env.RATE_LIMIT_PER_MIN, 20, { min: 1 }),
    aiDailyRequestLimit: integer('AI_DAILY_REQUEST_LIMIT', env.AI_DAILY_REQUEST_LIMIT, 100, { min: 1 }),
    privacyContactEmail,
    trustProxy: integer('TRUST_PROXY', env.TRUST_PROXY, 0),
    nodeEnv,
    sessionSecret,
    enforceHttps: nodeEnv === 'production',
    secureCookies: nodeEnv === 'production'
  };
  if (config.aiTotalTimeoutMs < config.aiTimeoutMs) throw new Error('AI_TOTAL_TIMEOUT_MS must be >= AI_TIMEOUT_MS');
  return Object.freeze(config);
}

