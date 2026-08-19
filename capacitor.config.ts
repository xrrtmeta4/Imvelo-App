import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.b4f47cfe1b284d6ea4df806ad32c6fc9',
  appName: 'imveloapp',
  webDir: 'dist',
  server: {
    url: 'https://b4f47cfe-1b28-4d6e-a4df-806ad32c6fc9.lovableproject.com?forceHideBadge=true',
    cleartext: true
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
