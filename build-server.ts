import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.cjs',
  format: 'cjs',
  external: [
    'express',
    'multer',
    'csv-parser',
    'pdf-parse',
    '@google/genai',
    'dotenv',
    'vite'
  ],
}).catch(() => process.exit(1));
