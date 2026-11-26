/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLAGSMITH_ENV_KEY?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_FLAGSMITH_API_URL?: string;
  readonly VITE_FLAGSMITH_EVENTS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
