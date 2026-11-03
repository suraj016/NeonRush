import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  base: './',
  assetsInclude: ['**/*.fbx'],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
