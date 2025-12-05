"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    appId: 'com.serverbackup.manager',
    appName: 'Multi-Server Backup Manager',
    webDir: 'dist/client',
    server: {
        androidScheme: 'https',
        iosScheme: 'https'
    },
    plugins: {
        Network: {},
        Preferences: {}
    }
};
exports.default = config;
