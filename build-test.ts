import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['test-pdf8.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/test-pdf8.cjs',
  format: 'cjs',
  external: ['pdf-parse'],
}).catch(() => process.exit(1));
