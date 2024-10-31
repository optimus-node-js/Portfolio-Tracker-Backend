// build.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./src/server.ts'], // Entry point for your backend
  bundle: true,
  platform: 'node', // Specifies Node.js environment
  target: 'node14', // Adjust based on the Node.js version
  outfile: './dist/server.js', // Output bundled file
  external: ['express', 'mongoose', 'dotenv'], // External modules you don’t want bundled
  sourcemap: true, // Generate source maps for debugging
  minify: false, // Disable minification for readability
}).then(() => {
  console.log('Build completed!');
}).catch((error) => {
  console.error('Build failed:', error);
});
