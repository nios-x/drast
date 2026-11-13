import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset URLs, so the same build works at DrastDB's /playground/
  // and at the root of any static host.
  base: './',
  plugins: [react()],
})
