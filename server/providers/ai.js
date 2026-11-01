import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export class ProviderError extends Error {
  constructor(code, cause) { super(code); this.name = 'ProviderError'; this.code = code; this.cause = cause; }
}

function providerSchema(schema, { dropAdditionalProperties = false } = {}) {
  const clone = structuredClone(schema);
  const strip = (node) => {
    if (!node || typeof node !== 'object') return;
    delete node.minItems; delete node.maxItems; delete node.minLength; delete node.maxLength;
    if (dropAdditionalProperties) delete node.additionalProperties;
    if (node.properties) Object.values(node.properties).forEach(strip);
    if (node.items) strip(node.items);
  };
  strip(clone);
  return clone;
}

function mapError(error, signal) {
  if (signal?.aborted || error?.name === 'AbortError' || error?.name === 'APIConnectionTimeoutError') return new ProviderError('timeout', error);
  const status = error?.status;
  if (status === 401 || status === 403) return new ProviderError('auth', error);
  if (status === 429 || status === 503) return new ProviderError('rate_limit', error);
  if (error instanceof SyntaxError || error?.code === 'JSON_PARSE_ERROR') return new ProviderError('bad_output', error);
  return new ProviderError('unknown', error);
}

function parseText(text) {
  try { return JSON.parse(typeof text === 'string' ? text : String(text)); }
  catch (error) { throw new ProviderError('bad_output', error); }
}

function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new ProviderError('timeout'));
  return Promise.race([
    promise,
    new Promise((_, reject) => signal.addEventListener('abort', () => reject(new ProviderError('timeout')), { once: true }))
  ]);
}

export function createProvider(config, clients = {}) {
  const openai = config.provider === 'openai' ? (clients.openai || new OpenAI({ apiKey: config.openaiApiKey })) : null;
  const gemini = config.provider === 'gemini' ? (clients.gemini || new GoogleGenAI({ apiKey: config.geminiApiKey })) : null;
  return {
    async generateJson({ system, user, schema, temperature, signal }) {
      try {
        if (config.provider === 'openai') {
          const response = await openai.chat.completions.create({
            model: config.openaiModel,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            ...(temperature !== undefined && temperature !== 'off' ? { temperature } : {}),
            response_format: { type: 'json_schema', json_schema: { name: 'flirtmate_replies', strict: true, schema: providerSchema(schema) } }
          }, { signal });
          return parseText(response.choices?.[0]?.message?.content);
        }
        const response = await abortable(gemini.models.generateContent({
          model: config.geminiModel,
          contents: `${system}\n\n${user}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: providerSchema(schema, { dropAdditionalProperties: true }),
            ...(temperature !== undefined && temperature !== 'off' ? { temperature } : {})
          }
        }), signal);
        return parseText(response.text);
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        throw mapError(error, signal);
      }
    }
  };
}

export async function generateJson(options) {
  if (!options?.provider) throw new Error('generateJson requires a provider instance');
  return options.provider.generateJson(options);
}
