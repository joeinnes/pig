import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  bundle: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist',
  clean: true,
})
