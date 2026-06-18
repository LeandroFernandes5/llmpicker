import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Attachment,
  Conversation,
  Message,
  ProviderError,
} from '@/providers/types';
import { getModelById } from '@/constants/models';
import { getProviderForModel } from '@/providers/registry';
import {
  countMessages,
  createConversation as dbCreateConversation,
  deleteConversation as dbDeleteConversation,
  getConversation,
  getTemplate,
  insertMessage,
  listConversations,
  listMessages,
  setConversationPinned,
  updateConversation,
} from '@/db/queries';
import { useApiKeysStore } from './api-keys';

const DEFAULT_TITLE = 'New chat';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function now(): number {
  return Date.now();
}

function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return DEFAULT_TITLE;
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

type ConversationsState = {
  db: SQLiteDatabase | null;
  conversations: Conversation[];
  currentId: string | null;
  currentMessages: Message[];
  currentModelId: string | null;
  currentTemplateId: string | null;
  loadingList: boolean;
  loadingMessages: boolean;
  sending: boolean;
  streamingText: string | null;
  error: string | null;

  init: (db: SQLiteDatabase) => Promise<void>;
  refreshList: () => Promise<void>;
  createNew: (modelId: string, templateId?: string | null) => Promise<string>;
  open: (id: string) => Promise<void>;
  close: () => void;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  cancelSend: () => void;
  switchModel: (modelId: string) => Promise<void>;
  setTemplate: (templateId: string | null) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearError: () => void;
};

let abortController: AbortController | null = null;

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  db: null,
  conversations: [],
  currentId: null,
  currentMessages: [],
  currentModelId: null,
  currentTemplateId: null,
  loadingList: false,
  loadingMessages: false,
  sending: false,
  streamingText: null,
  error: null,

  async init(db) {
    set({ db });
    await get().refreshList();
  },

  async refreshList() {
    const { db } = get();
    if (!db) return;
    set({ loadingList: true });
    try {
      const conversations = await listConversations(db);
      set({ conversations, loadingList: false });
    } catch (err) {
      set({ loadingList: false, error: (err as Error).message });
    }
  },

  async createNew(modelId, templateId) {
    const { db } = get();
    if (!db) throw new Error('Database is not ready.');
    const conversation: Conversation = {
      id: newId(),
      title: DEFAULT_TITLE,
      modelId,
      createdAt: now(),
      updatedAt: now(),
      pinned: false,
      templateId: templateId ?? null,
    };
    await dbCreateConversation(db, conversation);
    await get().refreshList();
    return conversation.id;
  },

  async open(id) {
    const { db } = get();
    if (!db) return;
    set({ currentId: id, loadingMessages: true, currentMessages: [], error: null });
    try {
      const conversation = await getConversation(db, id);
      if (!conversation) {
        set({ loadingMessages: false, error: 'Conversation not found.' });
        return;
      }
      const messages = await listMessages(db, id);
      set({
        currentMessages: messages,
        currentModelId: conversation.modelId,
        currentTemplateId: conversation.templateId ?? null,
        loadingMessages: false,
      });
    } catch (err) {
      set({ loadingMessages: false, error: (err as Error).message });
    }
  },

  close() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    set({
      currentId: null,
      currentMessages: [],
      currentModelId: null,
      currentTemplateId: null,
      streamingText: null,
      sending: false,
    });
  },

  async sendMessage(text, attachments) {
    const state = get();
    const { db, currentId, currentModelId } = state;
    if (!db || !currentId || !currentModelId) return;
    if (state.sending) return;

    const model = getModelById(currentModelId);
    if (!model) {
      set({ error: `Unknown model: ${currentModelId}` });
      return;
    }
    const provider = getProviderForModel(currentModelId);
    if (!provider) {
      set({ error: `No provider for model: ${currentModelId}` });
      return;
    }
    const apiKey = useApiKeysStore.getState().getKey(model.providerId);
    if (!apiKey) {
      set({
        error: `No API key set for ${provider.label}. Add it in Settings.`,
      });
      return;
    }

    const trimmed = text.trim();
    if (trimmed.length === 0 && (!attachments || attachments.length === 0)) return;

    const userMessage: Message = {
      id: newId(),
      role: 'user',
      content: trimmed,
      attachments: attachments ?? [],
      createdAt: now(),
    };
    const isFirst = state.currentMessages.length === 0;
    const nextMessages = [...state.currentMessages, userMessage];
    set({ currentMessages: nextMessages, sending: true, streamingText: '', error: null });

    try {
      await insertMessage(db, currentId, userMessage);
      if (isFirst) {
        const title = deriveTitle(trimmed);
        await updateConversation(db, currentId, { title, updatedAt: now() });
      } else {
        await updateConversation(db, currentId, { updatedAt: now() });
      }
    } catch (err) {
      set({ sending: false, error: (err as Error).message });
      return;
    }

    abortController = new AbortController();
    let assistantText = '';

    let history: Message[] = nextMessages;
    const templateId = state.currentTemplateId;
    if (templateId) {
      const template = await getTemplate(db, templateId);
      if (template && template.prompt.trim().length > 0) {
        const systemMessage: Message = {
          id: '__system__',
          role: 'system',
          content: template.prompt,
          attachments: [],
          createdAt: 0,
        };
        history = [systemMessage, ...nextMessages];
      }
    }

    await provider.streamMessage(
      {
        apiKey,
        modelId: currentModelId,
        history,
        signal: abortController.signal,
      },
      {
        onDelta(delta) {
          assistantText += delta;
          set({ streamingText: assistantText });
        },
        onDone(full) {
          const finalText = full.length > 0 ? full : assistantText;
          const assistantMessage: Message = {
            id: newId(),
            role: 'assistant',
            content: finalText,
            attachments: [],
            modelId: currentModelId,
            createdAt: now(),
          };
          set((s) => ({
            currentMessages: [...s.currentMessages, assistantMessage],
            streamingText: null,
            sending: false,
          }));
          insertMessage(db, currentId, assistantMessage)
            .then(() => updateConversation(db, currentId, { updatedAt: now() }))
            .then(() => get().refreshList())
            .catch((err) => set({ error: (err as Error).message }));
        },
        onError(err) {
          const message =
            (err as ProviderError).message ??
            `Failed to reach ${provider.label}. Check your API key and network.`;
          set({
            sending: false,
            streamingText: null,
            error: message,
          });
        },
      },
    );
  },

  cancelSend() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    const { streamingText, currentModelId, db, currentId } = get();
    if (streamingText && streamingText.length > 0 && db && currentId && currentModelId) {
      const assistantMessage: Message = {
        id: newId(),
        role: 'assistant',
        content: streamingText,
        attachments: [],
        modelId: currentModelId,
        createdAt: now(),
      };
      set((s) => ({
        currentMessages: [...s.currentMessages, assistantMessage],
        streamingText: null,
        sending: false,
      }));
      insertMessage(db, currentId, assistantMessage).catch(() => {});
    } else {
      set({ streamingText: null, sending: false });
    }
  },

  async switchModel(modelId) {
    const { db, currentId } = get();
    set({ currentModelId: modelId });
    if (db && currentId) {
      try {
        await updateConversation(db, currentId, { modelId, updatedAt: now() });
        await get().refreshList();
      } catch (err) {
        set({ error: (err as Error).message });
      }
    }
  },

  async setTemplate(templateId) {
    const { db, currentId } = get();
    set({ currentTemplateId: templateId });
    if (db && currentId) {
      try {
        await updateConversation(db, currentId, { templateId, updatedAt: now() });
        await get().refreshList();
      } catch (err) {
        set({ error: (err as Error).message });
      }
    }
  },

  async rename(id, title) {
    const { db } = get();
    if (!db) return;
    try {
      await updateConversation(db, id, { title });
      await get().refreshList();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  async remove(id) {
    const { db } = get();
    if (!db) return;
    try {
      await dbDeleteConversation(db, id);
      if (get().currentId === id) {
        set({ currentId: null, currentMessages: [], currentModelId: null, currentTemplateId: null });
      }
      await get().refreshList();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  async togglePin(id) {
    const { db, conversations } = get();
    if (!db) return;
    const target = conversations.find((c) => c.id === id);
    if (!target) return;
    try {
      await setConversationPinned(db, id, !target.pinned);
      await get().refreshList();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError() {
    set({ error: null });
  },
}));

export async function getConversationMessageCount(
  db: SQLiteDatabase,
  conversationId: string,
): Promise<number> {
  return countMessages(db, conversationId);
}
