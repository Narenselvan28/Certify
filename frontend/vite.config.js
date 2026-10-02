import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// For GitHub Pages deployment, set base to your repo path:
//   base: '/your-repo-name/'
// For local dev / root deployment:
//   base: '/'
export default defineConfig({
  plugins: [react()],
  base: './',
});
