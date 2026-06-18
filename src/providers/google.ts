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

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function toGeminiContents(history: SendMessageParams['history']): {
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
} {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];
  for (const m of history) {
    if (m.role === 'system') {
      if (m.content) systemParts.push(m.content);
      continue;
    }
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
    const parts: GeminiPart[] = [];
    for (const a of m.attachments ?? []) {
      parts.push({ inline_data: { mime_type: a.mimeType, data: a.base64 } });
    }
    if (m.content.length > 0) parts.push({ text: m.content });
    if (parts.length === 0) parts.push({ text: '' });
    contents.push({ role, parts });
  }
  const systemInstruction =
    systemParts.length > 0 ? { parts: [{ text: systemParts.join('\n\n') }] } : undefined;
  return { systemInstruction, contents };
}

export const googleProvider: LLMProvider = {
  id: 'google' as ProviderId,
  label: 'Google',
  baseUrl: BASE_URL,
  async listModels(): Promise<ModelInfo[]> {
    return getModelsByProvider('google');
  },
  supportsAttachments(_role, model) {
    return model.capabilities.vision || model.capabilities.documents;
  },
  async streamMessage(params: SendMessageParams, callbacks: StreamCallbacks): Promise<void> {
    const { apiKey, modelId, history, signal } = params;
    const { systemInstruction, contents } = toGeminiContents(history);
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;

    if (__DEV__) console.log('[stream] Google request model:', modelId);

    let result;
    let full = '';
    try {
      result = await streamSseRequest(
        {
          url: `${BASE_URL}/models/${encodeURIComponent(modelId)}:streamGenerateContent?alt=sse`,
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(body),
          signal,
        },
        (data) => {
          try {
            const evt = JSON.parse(data) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const parts = evt.candidates?.[0]?.content?.parts;
            if (parts) {
              for (const p of parts) {
                if (typeof p.text === 'string' && p.text.length > 0) {
                  full += p.text;
                  callbacks.onDelta(p.text);
                }
              }
            }
          } catch {
            // ignore malformed event
          }
        },
      );
    } catch (err) {
      if (isAbortError(err)) return;
      callbacks.onError(providerError('google', (err as Error).message));
      return;
    }
    if (result.status < 200 || result.status >= 300) {
      let message = `Google request failed (${result.status})`;
      try {
        const parsed = JSON.parse(result.body) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (result.body.length > 0) message = result.body;
      }
      callbacks.onError(providerError('google', message, result.status));
      return;
    }
    callbacks.onDone(full);
  },
};
