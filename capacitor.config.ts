import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b4f47cfe1b284d6ea4df806ad32c6fc9',
  appName: 'imveloapp',
  webDir: 'dist',
  // Production build: loads the bundled app from /dist (no dev hot-reload URL).
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    AdMob: {},
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: true,
      spinnerColor: '#22c55e',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: false
    }
  }
};

export default config;
