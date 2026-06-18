import type { SQLiteDatabase } from 'expo-sqlite';
import type { Attachment, Conversation, Message, Template } from '@/providers/types';

type ConversationRow = {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  pinned: number;
  templateId: string | null;
};

type MessageRow = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  attachments: string;
  modelId: string | null;
  createdAt: number;
};

type TemplateRow = {
  id: string;
  name: string;
  prompt: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
};

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    modelId: row.modelId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    pinned: !!row.pinned,
    templateId: row.templateId ?? null,
  };
}

function toTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    prompt: row.prompt,
    modelId: row.modelId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toMessage(row: MessageRow): Message {
  let attachments: Attachment[] = [];
  try {
    attachments = JSON.parse(row.attachments) as Attachment[];
  } catch {
    attachments = [];
  }
  return {
    id: row.id,
    role: row.role as Message['role'],
    content: row.content,
    attachments,
    modelId: row.modelId ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function listConversations(db: SQLiteDatabase): Promise<Conversation[]> {
  const rows = await db.getAllAsync<ConversationRow>(
    'SELECT * FROM conversations ORDER BY pinned DESC, updatedAt DESC',
  );
  return rows.map(toConversation);
}

export async function getConversation(
  db: SQLiteDatabase,
  id: string,
): Promise<Conversation | null> {
  const row = await db.getFirstAsync<ConversationRow>(
    'SELECT * FROM conversations WHERE id = ?',
    id,
  );
  return row ? toConversation(row) : null;
}

export async function createConversation(
  db: SQLiteDatabase,
  conversation: Conversation,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO conversations (id, title, modelId, createdAt, updatedAt, pinned, templateId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    conversation.id,
    conversation.title,
    conversation.modelId,
    conversation.createdAt,
    conversation.updatedAt,
    conversation.pinned ? 1 : 0,
    conversation.templateId ?? null,
  );
}

export async function setConversationPinned(
  db: SQLiteDatabase,
  id: string,
  pinned: boolean,
): Promise<void> {
  await db.runAsync('UPDATE conversations SET pinned = ? WHERE id = ?', pinned ? 1 : 0, id);
}

export async function updateConversation(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Conversation, 'title' | 'modelId' | 'updatedAt' | 'templateId'>>,
): Promise<void> {
  const existing = await getConversation(db, id);
  if (!existing) return;
  const next: Conversation = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt ?? existing.updatedAt,
  };
  await db.runAsync(
    'UPDATE conversations SET title = ?, modelId = ?, updatedAt = ?, templateId = ? WHERE id = ?',
    next.title,
    next.modelId,
    next.updatedAt,
    next.templateId ?? null,
    id,
  );
}

export async function deleteConversation(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM messages WHERE conversationId = ?', id);
    await db.runAsync('DELETE FROM conversations WHERE id = ?', id);
  });
}

export async function listMessages(
  db: SQLiteDatabase,
  conversationId: string,
): Promise<Message[]> {
  const rows = await db.getAllAsync<MessageRow>(
    'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC',
    conversationId,
  );
  return rows.map(toMessage);
}

export async function insertMessage(
  db: SQLiteDatabase,
  conversationId: string,
  message: Message,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO messages (id, conversationId, role, content, attachments, modelId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    message.id,
    conversationId,
    message.role,
    message.content,
    JSON.stringify(message.attachments ?? []),
    message.modelId ?? null,
    message.createdAt,
  );
}

export async function countMessages(db: SQLiteDatabase, conversationId: string): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM messages WHERE conversationId = ?',
    conversationId,
  );
  return row?.c ?? 0;
}

export async function listTemplates(db: SQLiteDatabase): Promise<Template[]> {
  const rows = await db.getAllAsync<TemplateRow>(
    'SELECT * FROM templates ORDER BY updatedAt DESC',
  );
  return rows.map(toTemplate);
}

export async function getTemplate(
  db: SQLiteDatabase,
  id: string,
): Promise<Template | null> {
  const row = await db.getFirstAsync<TemplateRow>(
    'SELECT * FROM templates WHERE id = ?',
    id,
  );
  return row ? toTemplate(row) : null;
}

export async function createTemplate(db: SQLiteDatabase, template: Template): Promise<void> {
  await db.runAsync(
    'INSERT INTO templates (id, name, prompt, modelId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    template.id,
    template.name,
    template.prompt,
    template.modelId,
    template.createdAt,
    template.updatedAt,
  );
}

export async function updateTemplate(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Template, 'name' | 'prompt' | 'modelId'>>,
): Promise<void> {
  const existing = await getTemplate(db, id);
  if (!existing) return;
  const next: Template = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  await db.runAsync(
    'UPDATE templates SET name = ?, prompt = ?, modelId = ?, updatedAt = ? WHERE id = ?',
    next.name,
    next.prompt,
    next.modelId,
    next.updatedAt,
    id,
  );
}

export async function deleteTemplate(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE conversations SET templateId = NULL WHERE templateId = ?',
    id,
  );
  await db.runAsync('DELETE FROM templates WHERE id = ?', id);
}
