import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

const sharedAlias = {
  '@': path.resolve(__dirname, './src'),
  '@shared': path.resolve(__dirname, './shared'),
  '@electron': path.resolve(__dirname, './electron')
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          resolve: {
            alias: sharedAlias
          },
          build: {
            sourcemap: true,
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs']
            },
            rollupOptions: {
              external: ['electron', 'sql.js'],
              output: {
                entryFileNames: '[name].js'
              }
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          resolve: {
            alias: sharedAlias
          },
          build: {
            sourcemap: true,
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs']
            },
            rollupOptions: {
              output: {
                entryFileNames: '[name].js'
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: sharedAlias
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
