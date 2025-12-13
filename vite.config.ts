import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

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
  };
});