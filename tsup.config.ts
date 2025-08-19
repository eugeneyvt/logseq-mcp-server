import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: true,
  minify: false,
  bundle: true,
  splitting: false,
  esbuildOptions: (options) => {
    options.conditions = ['node'];
  },
});
