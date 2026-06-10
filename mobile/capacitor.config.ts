import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pretoobranco.app",
  appName: "Preto ou Branco",
  // Frontend dist is built by the root `pnpm build` and lives one level up.
  // `npx cap sync android` copies it to android/app/src/main/assets/public/.
  webDir: "../frontend/dist",
  android: {
    // Serve the app via http:// so fetch calls to http://localhost:8080 are
    // same-origin and not blocked as mixed content on Android 9+.
    androidScheme: "http",
  },
};

export default config;
