import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
let sqlite;
try {
    sqlite = new Database('sqlite.db', {
        timeout: 5000, // 5 second timeout for database operations
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    });
    // Test the connection
    sqlite.prepare('SELECT 1').get();
    console.log('Database connection established');
}
catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
}
export const db = drizzle(sqlite, { schema });
//# sourceMappingURL=index.js.map