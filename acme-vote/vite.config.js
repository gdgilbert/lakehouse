import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built files work from any folder on a static host.
export default defineConfig({
  base: './',
  build: { outDir: 'demo', emptyOutDir: true },
  plugins: [react()],
});
