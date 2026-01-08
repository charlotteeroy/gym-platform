import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/schemas/index.ts', 'src/utils/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
});
