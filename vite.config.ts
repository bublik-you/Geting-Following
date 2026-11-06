import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project under the repository name.
  base: '/Geting-Following/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'], react: ['react', 'react-dom'] },
      },
    },
  },
});
