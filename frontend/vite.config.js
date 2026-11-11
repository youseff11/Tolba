import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Django backend address. Default = `manage.py runserver` (port 8000).
// Different port?  set BACKEND_URL=http://127.0.0.1:8001 before `npm run dev`.
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        // Without this Vite answers a bare 500 when Django is not running.
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res.headersSent) return;
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                detail:
                  `Backend (Django) is not running on ${BACKEND} – start it: python manage.py runserver / الـ Backend مش شغال على ${BACKEND}`,
              })
            );
          });
        },
      },
    },
  },
});
