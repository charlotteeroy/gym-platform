import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/services/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@gym/database', '@gym/shared'],
});
