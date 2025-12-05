"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var better_sqlite3_1 = require("better-sqlite3");
var better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
var schema = require("./schema");
var sqlite;
try {
    sqlite = new better_sqlite3_1.default('sqlite.db', {
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
exports.db = (0, better_sqlite3_2.drizzle)(sqlite, { schema: schema });
