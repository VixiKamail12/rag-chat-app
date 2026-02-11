import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function initDatabase(db: Database) {
  try {
    // Enable WAL mode for better concurrency
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    // Create documents table with vector support
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        embedding BLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
      CREATE INDEX IF NOT EXISTS idx_documents_text ON documents(text);
    `);

    // Create conversations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        messages_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
    `);

    // Create vector virtual table for similarity search
    // Note: This requires sqlite-vss extension to be loaded
    try {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_vss
        USING vss0(
          embedding(384)
        );

        INSERT OR IGNORE INTO documents_vss(rowid, embedding)
        SELECT id, embedding FROM documents WHERE embedding IS NOT NULL;
      `);
      console.log('✅ Vector search extension initialized');
    } catch (vssError) {
      console.warn('⚠️  Vector search extension not available, falling back to basic search');
      console.warn('   To enable vector search, load sqlite-vss extension');
    }

    console.log('✅ Database initialized successfully');
    console.log(`   Database path: ${db.name}`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export function ensureDataDirectory(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created data directory: ${dir}`);
  }
}

export default initDatabase;
