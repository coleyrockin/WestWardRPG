import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  appType: 'spa',
  resolve: {
    alias: [
      // The 3D engine renders with WebGPURenderer + TSL, which live in the
      // `three/webgpu` build. Plain `import ... from "three"` resolves to the
      // separate core build, producing TWO copies of Three.js (broken
      // instanceof, "Multiple instances" warning). Alias bare `three` to the
      // webgpu build — a superset of core — so there is exactly one instance.
      // The regex is anchored (^three$) so subpaths like `three/tsl` and
      // `three/webgpu` are NOT rewritten. The Canvas game (index.html) is 2D
      // and imports no Three, so it's unaffected.
      { find: /^three$/, replacement: 'three/webgpu' },
    ],
  },
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
