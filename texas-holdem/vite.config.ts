import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      crypto: fileURLToPath(new URL("./src/shims/crypto.ts", import.meta.url)),
      assert: fileURLToPath(new URL("./src/shims/assert.ts", import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: false },
  build: { target: "es2022" },
});
