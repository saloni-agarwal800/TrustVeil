import { build, context } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });
cpSync('manifest.json', 'dist/manifest.json');
cpSync('popup.html', 'dist/popup.html');

const options = {
  entryPoints: { content: 'src/content.ts', background: 'src/background.ts', popup: 'src/popup.ts' },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'chrome110',
  sourcemap: true,
  logLevel: 'info'
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching... reload the extension in chrome://extensions after each rebuild.');
} else {
  await build(options);
}
