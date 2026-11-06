// Bundles the TypeScript API into dist/server.js (used by api/index.js and `npm start`).
require('esbuild').build({
  entryPoints: ['./src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: './dist/server.js',
  external: ['express', 'mongoose', 'dotenv', 'cors'],
  sourcemap: true,
}).then(() => console.log('Build completed!')).catch((error) => { console.error('Build failed:', error); process.exit(1); });
