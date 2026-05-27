import type { AiProvider } from '../../shared/types.js';
import { MockAiProvider } from './mockProvider.js';
import { DeepSeekProvider } from './deepseekProvider.js';

export function createAiProvider(): AiProvider {
  const providerType = process.env.AI_PROVIDER || 'mock';

  switch (providerType) {
    case 'mock':
      return new MockAiProvider();
    case 'deepseek': {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'AI_PROVIDER=deepseek 但未配置 AI_API_KEY。请在 .env.local 中设置 AI_API_KEY。'
        );
      }
      return new DeepSeekProvider({
        apiKey,
        baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
        model: process.env.AI_MODEL || 'deepseek-chat',
        timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 60000,
      });
    }
    default:
      console.warn(`未知 AI_PROVIDER="${providerType}"，回退到 mock`);
      return new MockAiProvider();
  }
}
