import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

/**
 * Persistent JSON-file store. Used when MongoDB is unreachable so the app
 * still runs — and still survives a restart — with no external services.
 *
 * Everything is held in memory and flushed to disk on a short debounce, so
 * request handlers never wait on the filesystem.
 */
export function createFileStore() {
  const db = { conversations: [], messages: [], intelligence: [] };

  let flushTimer = null;
  let flushing = false;
  let dirtyDuringFlush = false;

  async function flush() {
    if (flushing) {
      dirtyDuringFlush = true;
      return;
    }
    flushing = true;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${DATA_FILE}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db), 'utf8');
      await fs.rename(tmp, DATA_FILE); // atomic swap, never a half-written store
    } catch (err) {
      console.error('[filestore] flush failed:', err.message);
    } finally {
      flushing = false;
      if (dirtyDuringFlush) {
        dirtyDuringFlush = false;
        schedule();
      }
    }
  }

  function schedule() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 200);
    flushTimer.unref?.();
  }

  return {
    kind: 'file',
    label: `file store (${path.relative(process.cwd(), DATA_FILE)})`,

    async init() {
      try {
        const raw = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        db.conversations = parsed.conversations ?? [];
        db.messages = parsed.messages ?? [];
        db.intelligence = parsed.intelligence ?? [];
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn('[filestore] could not read store, starting empty:', err.message);
        }
      }
    },

    async getConversation(conversationId) {
      return db.conversations.find((c) => c.conversation_id === conversationId) ?? null;
    },

    async saveConversation(conversation) {
      const i = db.conversations.findIndex(
        (c) => c.conversation_id === conversation.conversation_id
      );
      if (i === -1) db.conversations.push(conversation);
      else db.conversations[i] = conversation;
      schedule();
      return conversation;
    },

    async listConversations() {
      return db.conversations.slice();
    },

    async insertMessage(message) {
      db.messages.push(message);
      schedule();
      return message;
    },

    async listMessages(conversationId) {
      return db.messages.filter((m) => m.conversation_id === conversationId);
    },

    async listAllMessages() {
      return db.messages.slice();
    },

    async insertIntelligence(items) {
      if (!items.length) return [];
      db.intelligence.push(...items);
      schedule();
      return items;
    },

    async listIntelligence() {
      return db.intelligence.slice();
    },

    /** Values already recorded for a conversation, used to skip duplicates. */
    async knownIntelValues(conversationId) {
      return new Set(
        db.intelligence
          .filter((it) => it.conversation_id === conversationId)
          .map((it) => `${it.intel_type}:${it.value}`)
      );
    },

    async reset() {
      db.conversations = [];
      db.messages = [];
      db.intelligence = [];
      schedule();
    },

    async close() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flush();
    },
  };
}
