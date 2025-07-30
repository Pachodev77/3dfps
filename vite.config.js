import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) {
            return 'three';
          }
          if (id.includes('node_modules/three/examples/jsm/loaders/FBXLoader.js')) {
            return 'fbxloader';
          }
        },
      },
    },
  },
});