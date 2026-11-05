import { defineConfig } from 'vite';
export default defineConfig({base:'./',build:{rollupOptions:{output:{manualChunks:{phaser:['phaser'],react:['react','react-dom']}}}}});
