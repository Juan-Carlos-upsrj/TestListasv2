import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // Importa dinámicamente el plugin de React que es solo ESM
  const react = (await import('@vitejs/plugin-react')).default;

  return {
    plugins: [
      react(),
      electron([
        {
          // Main-Process entry.
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['electron-updater'],
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
            // instead of restarting the entire Electron App.
            options.reload()
          },
        },
      ]),
      renderer(),
    ],
    server: {
      // Forzamos que el servidor no intente buscar fuera de la raíz del proyecto web
      fs: {
        allow: ['.']
      }
    },
    resolve: {
      // Aseguramos que no escanee carpetas innecesarias
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
    },
    build: {
      rollupOptions: {
        // Marcamos los módulos de Capacitor como externos
        external: ['@capacitor/filesystem', '@capacitor/share'],
      },
    },
    // CRÍTICO: Ignorar carpetas de compilación de Android/iOS que confunden a Vite
    optimizeDeps: {
      exclude: ['android', 'ios']
    }
  };
});