import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative asset URLs, so the built page works under any path, such as
  // GitHub Pages' /perf-results-app/.
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2023'
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
