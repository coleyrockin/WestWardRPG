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
      // `three/webgpu` are NOT rewritten.
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
    // Single entry: index.html IS the 3D game (the Canvas raycaster was retired).
  },
});
