import { describe, expect, it } from 'vitest';
import { createProvider, ProviderError } from '../../server/providers/ai.js';
import { outputSchema } from '../../server/validate.js';

const config = { provider: 'openai', openaiApiKey: 'key', openaiModel: 'model', geminiApiKey: '', geminiModel: '' };

describe('provider adapter', () => {
  it('uses strict OpenAI JSON schema and omits temperature when off', async () => {
    let received;
    const provider = createProvider({ ...config, temperature: 'off' }, { openai: { chat: { completions: { create: async (params) => { received = params; return { choices: [{ message: { content: '{"replies":[]}' } }] }; } } } } });
    await provider.generateJson({ system: 's', user: 'u', schema: outputSchema, temperature: 'off' });
    expect(received.response_format.json_schema.strict).toBe(true);
    expect(received).not.toHaveProperty('temperature');
    expect(received.messages).toHaveLength(2);
  });

  it('maps provider status and malformed JSON errors', async () => {
    const auth = createProvider(config, { openai: { chat: { completions: { create: async () => { throw Object.assign(new Error('secret'), { status: 401 }); } } } } });
    await expect(auth.generateJson({ system: '', user: '', schema: outputSchema })).rejects.toMatchObject({ code: 'auth' });
    const malformed = createProvider(config, { openai: { chat: { completions: { create: async () => ({ choices: [{ message: { content: 'not json' } }] }) } } } });
    await expect(malformed.generateJson({ system: '', user: '', schema: outputSchema })).rejects.toMatchObject({ code: 'bad_output' });
  });

  it('supports Gemini JSON response configuration', async () => {
    let received;
    const provider = createProvider({ provider: 'gemini', geminiApiKey: 'key', geminiModel: 'model' }, { gemini: { models: { generateContent: async (params) => { received = params; return { text: '{"replies":[]}' }; } } } });
    await provider.generateJson({ system: 's', user: 'u', schema: outputSchema, temperature: 0.5 });
    expect(received.config.responseMimeType).toBe('application/json');
    expect(received.config.temperature).toBe(0.5);
    expect(received.config.responseSchema).not.toHaveProperty('minItems');
  });
});
