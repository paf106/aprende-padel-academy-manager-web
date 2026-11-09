import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  configLoader: 'runner',
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
})
