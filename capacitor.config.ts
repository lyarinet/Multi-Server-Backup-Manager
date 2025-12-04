import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
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

export default config;

