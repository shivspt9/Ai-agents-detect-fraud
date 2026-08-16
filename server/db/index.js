import { createMongoStore } from './mongo.js';
import { createFileStore } from './filestore.js';

/**
 * Picks a storage driver at boot: MongoDB when MONGODB_URI is set and the
 * server actually answers, otherwise a persistent JSON file store.
 *
 * Set STORAGE=file to skip Mongo entirely, or STORAGE=mongo to make an
 * unreachable Mongo a hard boot failure instead of falling back.
 */
export async function createStore() {
  const mode = (process.env.STORAGE || 'auto').toLowerCase();
  const uri = process.env.MONGODB_URI;

  if (mode === 'file' || (mode === 'auto' && !uri)) {
    const store = createFileStore();
    await store.init();
    console.log(`💾 Storage: ${store.label}`);
    return store;
  }

  if (!uri) {
    throw new Error('STORAGE=mongo requires MONGODB_URI to be set');
  }

  const mongo = createMongoStore(uri);
  try {
    await mongo.init();
    console.log(`💾 Storage: ${mongo.label}`);
    return mongo;
  } catch (err) {
    await mongo.close().catch(() => {});

    if (mode === 'mongo') {
      throw new Error(`MongoDB unreachable at ${uri}: ${err.message}`);
    }

    console.warn(`⚠️  MongoDB unreachable (${err.message})`);
    console.warn('   Falling back to the local file store. Start MongoDB with:');
    console.warn('   docker compose up -d mongodb');

    const store = createFileStore();
    await store.init();
    console.log(`💾 Storage: ${store.label}`);
    return store;
  }
}
