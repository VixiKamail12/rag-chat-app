import Database from 'better-sqlite3';
import { initDatabase, ensureDataDirectory } from './database';
import dotenv from 'dotenv';

dotenv.config();

const databasePath = process.env.DATABASE_PATH || './data/rag.db';

// Ensure data directory exists
ensureDataDirectory(databasePath);

// Initialize database connection
const db = new Database(databasePath);

// Initialize database schema
try {
  initDatabase(db);
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

export default db;
