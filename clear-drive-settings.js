#!/usr/bin/env node

/**
 * Clear Google Drive settings from the database
 * Usage: npx tsx clear-drive-settings.js
 */

import { db } from './src/server/db/index.ts';
import { settings } from './src/server/db/schema.ts';
import { eq } from 'drizzle-orm';

async function clearDriveSettings() {
    try {
        console.log('Clearing Google Drive settings...\n');
        
        const existing = await db.select().from(settings).limit(1);
        
        if (existing.length === 0) {
            console.log('No settings found in database.');
            process.exit(0);
        }
        
        const cfg = existing[0];
        console.log('Current Drive settings:');
        console.log('  - Client ID:', cfg.driveClientId ? 'Set (' + cfg.driveClientId.substring(0, 20) + '...)' : 'Not set');
        console.log('  - Client Secret:', cfg.driveClientSecret ? 'Set' : 'Not set');
        console.log('  - Refresh Token:', cfg.driveRefreshToken ? 'Set (' + (cfg.driveRefreshToken.length || 0) + ' chars)' : 'Not set');
        console.log('  - Folder ID:', cfg.driveFolderId || 'Not set');
        console.log('');
        
        await db.update(settings)
            .set({
                driveClientId: null,
                driveClientSecret: null,
                driveRefreshToken: null,
                driveFolderId: null,
                driveAutoUpload: false,
            })
            .where(eq(settings.id, cfg.id));
        
        console.log('✅ Google Drive settings cleared successfully!');
        console.log('\nYou can now configure Google Drive again from the Settings page.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing Drive settings:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

clearDriveSettings();
