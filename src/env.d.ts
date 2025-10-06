/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AIOLA_API_URL: string;
  readonly VITE_ENABLE_CLIENT_SDK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constant injected at build time
declare const __APP_VERSION__: string;
