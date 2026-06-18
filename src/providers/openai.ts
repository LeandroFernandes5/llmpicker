import type {
  Attachment,
  ChatRole,
  LLMProvider,
  ModelInfo,
  ProviderId,
  SendMessageParams,
  StreamCallbacks,
} from './types';
import { isAbortError, providerError, streamSseRequest } from './stream';
import { getModelsByProvider } from '@/constants/models';

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

type OpenAIMessage = {
  role: ChatRole;
  content: string | OpenAIContentPart[];
};

const BASE_URL = 'https://api.openai.com/v1';

function buildContent(text: string, attachments: Attachment[] | undefined): string | OpenAIContentPart[] {
  const images = attachments?.filter((a) => a.role === 'image') ?? [];
  if (images.length === 0) return text;
  const parts: OpenAIContentPart[] = [];
  if (text.length > 0) parts.push({ type: 'text', text });
  for (const img of images) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }
  return parts;
}

function toOpenAIMessages(history: SendMessageParams['history']): OpenAIMessage[] {
  return history.map((m) => ({
    role: m.role,
    content: buildContent(m.content, m.attachments),
  }));
}

export const openaiProvider: LLMProvider = {
  id: 'openai' as ProviderId,
  label: 'OpenAI',
  baseUrl: BASE_URL,
  async listModels(): Promise<ModelInfo[]> {
    return getModelsByProvider('openai');
  },
  supportsAttachments(_role, model) {
    return model.capabilities.vision;
  },
  async streamMessage(params: SendMessageParams, callbacks: StreamCallbacks): Promise<void> {
    const { apiKey, modelId, history, signal } = params;
    const messages = toOpenAIMessages(history);
    if (__DEV__) console.log('[stream] OpenAI request model:', modelId);
    let result;
    let full = '';
    try {
      result = await streamSseRequest(
        {
          url: `${BASE_URL}/chat/completions`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ model: modelId, messages, stream: true }),
          signal,
        },
        (data) => {
          if (data === '[DONE]') return;
          try {
            const evt = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = evt.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              full += delta;
              callbacks.onDelta(delta);
            }
          } catch {
            // ignore malformed event
          }
        },
      );
    } catch (err) {
      if (isAbortError(err)) return;
      callbacks.onError(providerError('openai', (err as Error).message));
      return;
    }
    if (result.status < 200 || result.status >= 300) {
      let message = `OpenAI request failed (${result.status})`;
      try {
        const parsed = JSON.parse(result.body) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (result.body.length > 0) message = result.body;
      }
      callbacks.onError(providerError('openai', message, result.status));
      return;
    }
    callbacks.onDone(full);
  },
};
