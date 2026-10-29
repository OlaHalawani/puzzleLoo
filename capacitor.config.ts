import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change this to your own reverse-domain ID before publishing; it must be unique on the stores.
  appId: 'com.puzzleloo.app',
  appName: 'PuzzleLoo',
  webDir: 'dist',
  backgroundColor: '#1a0b3d',
  ios: { contentInset: 'never' },
  android: { allowMixedContent: false },
};

export default config;
