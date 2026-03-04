import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  bundle: true,
  noExternal: [/.*/],
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist',
  clean: true,
})
