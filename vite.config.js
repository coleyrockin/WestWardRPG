import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  appType: 'spa',
  server: {
    port: 5180,
    strictPort: false,
    open: false,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    strictPort: false,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        // Engine-rewrite spike dev route (Milestone 1). Keeps build coverage of
        // the Three.js page; the Canvas game entry (main) is unchanged. The
        // spike HTML lives under spikes/ to keep the repo root quiet.
        render3d: 'spikes/render3d.html',
      },
    },
  },
});
