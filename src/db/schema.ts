import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = versionRow?.user_version ?? 0;
  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
PRAGMA journal_mode = 'wal';
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  modelId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  templateId TEXT
);
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  modelId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT NOT NULL DEFAULT '[]',
  modelId TEXT,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (conversationId) REFERENCES conversations (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversationId, createdAt);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updatedAt DESC);
`);
    currentDbVersion = 3;
  }

  if (currentDbVersion === 1) {
    await db.execAsync(`ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;`);
    currentDbVersion = 2;
  }

  if (currentDbVersion === 2) {
    await db.execAsync(`
ALTER TABLE conversations ADD COLUMN templateId TEXT;
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  modelId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
`);
    currentDbVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
