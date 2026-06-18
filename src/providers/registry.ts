import type { LLMProvider, ProviderId } from './types';
import { anthropicProvider } from './anthropic';
import { googleProvider } from './google';
import { openaiProvider } from './openai';
import { getModelById } from '@/constants/models';

export const PROVIDERS: Record<ProviderId, LLMProvider> = {
  google: googleProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

export const PROVIDER_LIST: LLMProvider[] = Object.values(PROVIDERS);

export function getProvider(id: ProviderId): LLMProvider {
  return PROVIDERS[id];
}

export function getProviderForModel(modelId: string): LLMProvider | undefined {
  const model = getModelById(modelId);
  if (!model) return undefined;
  return PROVIDERS[model.providerId];
}

