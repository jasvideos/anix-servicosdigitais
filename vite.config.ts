
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
<<<<<<< HEAD
      includeAssets: ['icon.svg'],
=======
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
      manifest: {
        name: 'Anix - Gerador A4',
        short_name: 'Anix',
        description: 'Gerador de impressões A4, stickers e fotos Polaroids',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'icon.svg',
<<<<<<< HEAD
            sizes: '192x192 512x512',
=======
            sizes: '512x512',
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
              'application/pdf': ['.pdf']
            }
          }
        ]
<<<<<<< HEAD
      },
      devOptions: {
        enabled: true,
        type: 'module',
=======
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
      }
    })
  ],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || '')
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  },
  server: {
    port: 3000
  }
});
