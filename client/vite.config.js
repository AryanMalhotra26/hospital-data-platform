import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config. The React plugin enables JSX + Fast Refresh. We pin the dev
// server to port 5173 because the backend's CORS allowlist (CLIENT_ORIGIN in
// server/.env) expects exactly http://localhost:5173.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
