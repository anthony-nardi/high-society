import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The server owns the game types; the client imports them directly.
      "@games": fileURLToPath(new URL("./functions/src", import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL(".", import.meta.url))],
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
