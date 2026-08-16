import { MongoClient } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB || 'scam-sentinel';

/**
 * MongoDB-backed store. Connects with a short timeout so an unreachable
 * server fails fast and the caller can fall back rather than hanging boot.
 */
export function createMongoStore(uri) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 3000),
    connectTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 3000),
  });

  let conversations;
  let messages;
  let intelligence;

  return {
    kind: 'mongo',
    label: `MongoDB (${DB_NAME})`,

    async init() {
      await client.connect();
      await client.db(DB_NAME).command({ ping: 1 }); // prove it really answers
      const db = client.db(DB_NAME);
      conversations = db.collection('conversations');
      messages = db.collection('messages');
      intelligence = db.collection('intelligence');

      await Promise.all([
        conversations.createIndex({ conversation_id: 1 }, { unique: true }),
        conversations.createIndex({ last_activity_at: -1 }),
        messages.createIndex({ conversation_id: 1, timestamp: 1 }),
        intelligence.createIndex({ extracted_at: -1 }),
        intelligence.createIndex({ conversation_id: 1, intel_type: 1, value: 1 }),
      ]);
    },

    async getConversation(conversationId) {
      return conversations.findOne(
        { conversation_id: conversationId },
        { projection: { _id: 0 } }
      );
    },

    async saveConversation(conversation) {
      await conversations.replaceOne(
        { conversation_id: conversation.conversation_id },
        conversation,
        { upsert: true }
      );
      return conversation;
    },

    async listConversations() {
      return conversations.find({}, { projection: { _id: 0 } }).toArray();
    },

    async insertMessage(message) {
      await messages.insertOne({ ...message });
      return message;
    },

    async listMessages(conversationId) {
      return messages
        .find({ conversation_id: conversationId }, { projection: { _id: 0 } })
        .toArray();
    },

    async listAllMessages() {
      return messages.find({}, { projection: { _id: 0 } }).toArray();
    },

    async insertIntelligence(items) {
      if (!items.length) return [];
      await intelligence.insertMany(items.map((i) => ({ ...i })));
      return items;
    },

    async listIntelligence() {
      return intelligence.find({}, { projection: { _id: 0 } }).toArray();
    },

    async knownIntelValues(conversationId) {
      const rows = await intelligence
        .find({ conversation_id: conversationId }, { projection: { _id: 0, intel_type: 1, value: 1 } })
        .toArray();
      return new Set(rows.map((r) => `${r.intel_type}:${r.value}`));
    },

    async reset() {
      await Promise.all([
        conversations.deleteMany({}),
        messages.deleteMany({}),
        intelligence.deleteMany({}),
      ]);
    },

    async close() {
      await client.close();
    },
  };
}
