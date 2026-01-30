import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/agro-berry-manager/',
  build: {
    outDir: 'dist'
  }
})
