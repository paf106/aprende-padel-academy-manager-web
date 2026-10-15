import { defineConfig } from 'vitest/config'

export default defineConfig({
  configLoader: 'runner',
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
  },
})
