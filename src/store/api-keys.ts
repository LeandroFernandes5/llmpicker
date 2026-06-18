import { create } from 'zustand';
import {
  deleteItemAsync,
  getItemAsync,
  setItemAsync,
} from '@/lib/secure-storage';
import type { ProviderId } from '@/providers/types';

const KEY_PREFIX = 'llmpicker_api-key_';

const ALL_PROVIDERS: ProviderId[] = ['google', 'openai', 'anthropic'];

function keyFor(providerId: ProviderId): string {
  return `${KEY_PREFIX}${providerId}`;
}
type ApiKeysState = {
  keys: Record<ProviderId, string>;
  loaded: boolean;
  init: () => Promise<void>;
  setKey: (providerId: ProviderId, value: string) => Promise<void>;
  clearKey: (providerId: ProviderId) => Promise<void>;
  getKey: (providerId: ProviderId) => string;
  hasKey: (providerId: ProviderId) => boolean;
};

export const useApiKeysStore = create<ApiKeysState>((set, get) => ({
  keys: { google: '', openai: '', anthropic: '' },
  loaded: false,
  async init() {
    const keys = { ...get().keys };
    for (const p of ALL_PROVIDERS) {
      const stored = (await getItemAsync(keyFor(p))) ?? '';
      keys[p] = stored;
    }
    set({ keys, loaded: true });
  },
  async setKey(providerId, value) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      await setItemAsync(keyFor(providerId), trimmed);
    } else {
      await deleteItemAsync(keyFor(providerId));
    }
    set((state) => ({ keys: { ...state.keys, [providerId]: trimmed } }));
  },
  async clearKey(providerId) {
    await deleteItemAsync(keyFor(providerId));
    set((state) => ({ keys: { ...state.keys, [providerId]: '' } }));
  },
  getKey(providerId) {
    return get().keys[providerId];
  },
  hasKey(providerId) {
    return get().keys[providerId].length > 0;
  },
}));
