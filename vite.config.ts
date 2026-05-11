import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'copy-data-txt',
        closeBundle() {
          const rootData = path.resolve(__dirname, 'data.txt');
          const distData = path.resolve(__dirname, 'dist/data.txt');
          if (fs.existsSync(rootData)) {
            // Only copy if it exists and we're not in the process of deleting it
            fs.copyFileSync(rootData, distData);
          }
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/data.txt' || req.url === './data.txt') {
              const rootData = path.resolve(__dirname, 'data.txt');
              if (fs.existsSync(rootData)) {
                res.setHeader('Content-Type', 'text/plain');
                res.end(fs.readFileSync(rootData));
                return;
              }
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
