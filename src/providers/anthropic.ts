import type {
  Attachment,
  LLMProvider,
  ModelInfo,
  ProviderId,
  SendMessageParams,
  StreamCallbacks,
} from './types';
import { isAbortError, providerError, streamSseRequest } from './stream';
import { getModelsByProvider } from '@/constants/models';

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } };

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

const BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 8192;

function toAnthropicContent(
  text: string,
  attachments: Attachment[] | undefined,
): string | AnthropicContentBlock[] {
  if (!attachments || attachments.length === 0) return text;
  const blocks: AnthropicContentBlock[] = [];
  for (const a of attachments) {
    if (a.role === 'image') {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: a.mimeType, data: a.base64 },
      });
    } else {
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: a.mimeType, data: a.base64 },
      });
    }
  }
  if (text.length > 0) blocks.push({ type: 'text', text });
  return blocks;
}

function splitSystemMessages(history: SendMessageParams['history']): {
  system: string | undefined;
  messages: AnthropicMessage[];
} {
  const systemParts: string[] = [];
  const messages: AnthropicMessage[] = [];
  for (const m of history) {
    if (m.role === 'system') {
      if (m.content) systemParts.push(m.content);
      continue;
    }
    messages.push({
      role: m.role as 'user' | 'assistant',
      content: toAnthropicContent(m.content, m.attachments),
    });
  }
  const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
  return { system, messages };
}

export const anthropicProvider: LLMProvider = {
  id: 'anthropic' as ProviderId,
  label: 'Anthropic',
  baseUrl: BASE_URL,
  async listModels(): Promise<ModelInfo[]> {
    return getModelsByProvider('anthropic');
  },
  supportsAttachments(_role, model) {
    return model.capabilities.vision || model.capabilities.documents;
  },
  async streamMessage(params: SendMessageParams, callbacks: StreamCallbacks): Promise<void> {
    const { apiKey, modelId, history, signal } = params;
    const { system, messages } = splitSystemMessages(history);
    const body: Record<string, unknown> = {
      model: modelId,
      messages,
      max_tokens: DEFAULT_MAX_TOKENS,
      stream: true,
    };
    if (system) body.system = system;

    if (__DEV__) console.log('[stream] Anthropic request model:', modelId);
    let result;
    let full = '';
    try {
      result = await streamSseRequest(
        {
          url: `${BASE_URL}/messages`,
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-dangerous-direct-browser-access': 'true',
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(body),
          signal,
        },
        (data) => {
          try {
            const evt = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text?: string };
            };
            if (
              evt.type === 'content_block_delta' &&
              evt.delta?.type === 'text_delta' &&
              evt.delta.text
            ) {
              full += evt.delta.text;
              callbacks.onDelta(evt.delta.text);
            }
          } catch {
            // ignore malformed event
          }
        },
      );
    } catch (err) {
      if (isAbortError(err)) return;
      callbacks.onError(providerError('anthropic', (err as Error).message));
      return;
    }
    if (result.status < 200 || result.status >= 300) {
      let message = `Anthropic request failed (${result.status})`;
      try {
        const parsed = JSON.parse(result.body) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (result.body.length > 0) message = result.body;
      }
      callbacks.onError(providerError('anthropic', message, result.status));
      return;
    }
    callbacks.onDone(full);
  },
};
