import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.janveryu.hatian",
  appName: "Hatian",
  webDir: "public",
  server: {
    url: "https://hatian-sage.vercel.app",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#09090B",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090B",
      overlaysWebView: false,
    },
  },
};

export default config;
