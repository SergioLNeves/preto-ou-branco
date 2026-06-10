import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pretoobranco.app",
  appName: "Preto ou Branco",
  // Frontend dist is built by the root `pnpm build` and lives one level up.
  // `npx cap sync android` copies it to android/app/src/main/assets/public/.
  webDir: "../frontend/dist",
  android: {
    // Allow the WebView to reach the local Go server on cleartext HTTP.
    allowMixedContent: true,
  },
};

export default config;
