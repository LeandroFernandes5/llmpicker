export type ProviderId = 'google' | 'openai' | 'anthropic';

export type AttachmentRole = 'image' | 'document';

export type ModelCapabilities = {
  vision: boolean;
  documents: boolean;
  streaming: boolean;
};

export type ModelInfo = {
  id: string;
  providerId: ProviderId;
  label: string;
  capabilities: ModelCapabilities;
};

export type Attachment = {
  id: string;
  role: AttachmentRole;
  mimeType: string;
  fileName?: string;
  base64: string;
};

export type ChatRole = 'user' | 'assistant' | 'system';

export type Message = {
  id: string;
  role: ChatRole;
  content: string;
  attachments: Attachment[];
  modelId?: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  templateId?: string | null;
};

export type Template = {
  id: string;
  name: string;
  prompt: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
};

export type ProviderError = Error & {
  providerId: ProviderId;
  status?: number;
};

export type StreamCallbacks = {
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: ProviderError) => void;
};

export type SendMessageParams = {
  apiKey: string;
  modelId: string;
  history: Message[];
  attachments?: Attachment[];
  signal?: AbortSignal;
};

export interface LLMProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly baseUrl: string;
  listModels(apiKey: string, signal?: AbortSignal): Promise<ModelInfo[]>;
  streamMessage(params: SendMessageParams, callbacks: StreamCallbacks): Promise<void>;
  supportsAttachments(role: AttachmentRole, model: ModelInfo): boolean;
}
