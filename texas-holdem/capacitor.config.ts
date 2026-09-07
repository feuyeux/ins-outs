import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.riverclub.poker",
  appName: "River Club",
  webDir: "dist",
  backgroundColor: "#111817",
  ios: { contentInset: "never" },
  android: { allowMixedContent: true },
};
export default config;
