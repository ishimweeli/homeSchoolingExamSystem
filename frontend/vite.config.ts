import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5001,
    host: true,
  },
  build: {
    // Disable type checking during build for faster builds
    // Type checking should be done separately in CI/CD
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        warn(warning)
      }
    }
  },
  esbuild: {
    // Relax esbuild type checking
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
