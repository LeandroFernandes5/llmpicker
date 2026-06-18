import type { ModelInfo, ProviderId } from '@/providers/types';

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'gemini-3.1-pro-preview',
    providerId: 'google',
    label: 'Gemini 3.1 Pro (Preview)',
    capabilities: { vision: true, documents: true, streaming: true },
  },
  {
    id: 'gemini-3.5-flash',
    providerId: 'google',
    label: 'Gemini 3.5 Flash',
    capabilities: { vision: true, documents: true, streaming: true },
  },
  {
    id: 'gemini-3.1-flash-lite',
    providerId: 'google',
    label: 'Gemini 3.1 Flash Lite',
    capabilities: { vision: true, documents: true, streaming: true },
  },
  {
    id: 'gpt-4.1',
    providerId: 'openai',
    label: 'GPT-4.1',
    capabilities: { vision: true, documents: false, streaming: true },
  },
  {
    id: 'gpt-4.1-mini',
    providerId: 'openai',
    label: 'GPT-4.1 mini',
    capabilities: { vision: true, documents: false, streaming: true },
  },
  {
    id: 'gpt-4.1-nano',
    providerId: 'openai',
    label: 'GPT-4.1 nano',
    capabilities: { vision: true, documents: false, streaming: true },
  },
  {
    id: 'gpt-4o',
    providerId: 'openai',
    label: 'GPT-4o',
    capabilities: { vision: true, documents: false, streaming: true },
  },
  {
    id: 'gpt-4o-mini',
    providerId: 'openai',
    label: 'GPT-4o mini',
    capabilities: { vision: true, documents: false, streaming: true },
  },
  {
    id: 'o3-mini',
    providerId: 'openai',
    label: 'o3-mini',
    capabilities: { vision: false, documents: false, streaming: true },
  },
  {
    id: 'claude-3-5-sonnet-latest',
    providerId: 'anthropic',
    label: 'Claude 3.5 Sonnet',
    capabilities: { vision: true, documents: true, streaming: true },
  },
  {
    id: 'claude-3-5-haiku-latest',
    providerId: 'anthropic',
    label: 'Claude 3.5 Haiku',
    capabilities: { vision: true, documents: true, streaming: true },
  },
  {
    id: 'claude-3-opus-latest',
    providerId: 'anthropic',
    label: 'Claude 3 Opus',
    capabilities: { vision: true, documents: true, streaming: true },
  },
];

export function getModelById(modelId: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId);
}

export function getModelsByProvider(providerId: ProviderId): ModelInfo[] {
  return MODEL_CATALOG.filter((m) => m.providerId === providerId);
}

export const DEFAULT_MODEL_ID = 'gemini-3.5-flash';
