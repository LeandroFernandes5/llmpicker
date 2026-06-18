import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Template } from '@/providers/types';
import {
  createTemplate as dbCreateTemplate,
  deleteTemplate as dbDeleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate as dbUpdateTemplate,
} from '@/db/queries';
import { DEFAULT_MODEL_ID } from '@/constants/models';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type TemplateDraft = {
  name: string;
  prompt: string;
  modelId: string;
};

type TemplatesState = {
  db: SQLiteDatabase | null;
  templates: Template[];
  loading: boolean;
  error: string | null;

  init: (db: SQLiteDatabase) => Promise<void>;
  refresh: () => Promise<void>;
  getById: (id: string) => Template | undefined;
  create: (draft: TemplateDraft) => Promise<string>;
  update: (id: string, patch: Partial<TemplateDraft>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearError: () => void;
};

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  db: null,
  templates: [],
  loading: false,
  error: null,

  async init(db) {
    set({ db });
    await get().refresh();
  },

  async refresh() {
    const { db } = get();
    if (!db) return;
    set({ loading: true });
    try {
      const templates = await listTemplates(db);
      set({ templates, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  getById(id) {
    return get().templates.find((t) => t.id === id);
  },

  async create(draft) {
    const { db } = get();
    if (!db) throw new Error('Database is not ready.');
    const now = Date.now();
    const template: Template = {
      id: newId(),
      name: draft.name.trim() || 'Untitled template',
      prompt: draft.prompt,
      modelId: draft.modelId || DEFAULT_MODEL_ID,
      createdAt: now,
      updatedAt: now,
    };
    await dbCreateTemplate(db, template);
    await get().refresh();
    return template.id;
  },

  async update(id, patch) {
    const { db } = get();
    if (!db) return;
    try {
      await dbUpdateTemplate(db, id, patch);
      await get().refresh();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  async remove(id) {
    const { db } = get();
    if (!db) return;
    try {
      await dbDeleteTemplate(db, id);
      await get().refresh();
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError() {
    set({ error: null });
  },
}));

export async function findTemplate(
  db: SQLiteDatabase,
  id: string,
): Promise<Template | null> {
  return getTemplate(db, id);
}
