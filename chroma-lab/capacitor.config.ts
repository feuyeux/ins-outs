import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chromalab.game',
  appName: 'Chroma Lab',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#0f2033',
  android: {
    backgroundColor: '#0f2033',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0f2033',
  },
};

export default config;
