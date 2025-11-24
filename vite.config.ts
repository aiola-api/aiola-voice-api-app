/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

// Read version from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  base: process.env.NODE_ENV === "production" ? "/aiola-voice-api-app/" : "/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  build: {
    outDir: "docs",
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core dependencies
          vendor: ["react", "react-dom"],

          // State management and core utilities
          state: ["recoil"],

          // UI component libraries
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],

          // Icon libraries
          icons: ["lucide-react", "@tabler/icons-react"],

          // Audio processing
          audio: ["wavesurfer.js"],

          // SDK
          sdk: ["@aiola/sdk"],

          // Other utilities
          utils: ["sonner", "next-themes"],
        },
      },
    },
    chunkSizeWarningLimit: 200, // Set warning limit to 200kB for better optimization monitoring
  },
});
