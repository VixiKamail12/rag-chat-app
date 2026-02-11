import Database from 'better-sqlite3';

export function initDatabase(db: Database) {
  // Enable vector extensions
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  // Create documents table with vector support
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_vss
    USING vss0(
      embedding(384)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      embedding BLOB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO documents_vss(documents)
      SELECT id, embedding FROM documents;
  `);
}

export default initDatabase;
