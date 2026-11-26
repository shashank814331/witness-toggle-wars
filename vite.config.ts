import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: process.env.WITNESS_OUT_DIR ?? 'dist',
    emptyOutDir: true,
  },
});
