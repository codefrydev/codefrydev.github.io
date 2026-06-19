/**
 * Bundles and minifies site JavaScript (same idea as bundle-site-css.mjs).
 *
 * Outputs:
 *   site.min.js           — theme, a11y, nav, cookie consent, analytics, footer
 *   home.min.js           — hero carousel, scroll (homepage only)
 *   ladybug.min.js        — ladybug easter egg (homepage only, lazy-loaded)
 *   search-palette.min.js — search palette (after inline window.CFD_SEARCH)
 *   cfddc.min.js          — CFDDC year pages only
 *
 * Run: npm run build:js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transformSync, buildSync } from 'esbuild';

const __dir = dirname(fileURLToPath(import.meta.url));
const jsDir = resolve(__dir, '../static/js');

const BUNDLES = [
  {
    out: 'site.min.js',
    files: [
      'theme.js',
      'a11y.js',
      'home-nav.js',
      'cookie-consent.js',
      'analytics.js',
      'site-footer.js',
    ],
  },
  {
    out: 'home.min.js',
    files: ['hero-carousel.js', 'home-scroll.js'],
  },
  {
    out: 'hero-carousel.min.js',
    files: ['hero-carousel.js'],
  },
  {
    out: 'ladybug.min.js',
    files: ['ladybug.js'],
  },
  {
    out: 'search-palette.min.js',
    files: ['search-palette.js'],
  },
  {
    out: 'cfddc.min.js',
    files: ['cfddc.js'],
  },
];

let totalIn = 0;
let totalOut = 0;

for (const bundle of BUNDLES) {
  const outPath = resolve(jsDir, bundle.out);

  if (bundle.out === 'search-palette.min.js') {
    const entryPath = resolve(jsDir, bundle.files[0]);
    const source = readFileSync(entryPath, 'utf8');
    const result = buildSync({
      entryPoints: [entryPath],
      bundle: true,
      format: 'iife',
      minify: true,
      target: 'es2018',
      write: false,
    });
    const code = result.outputFiles[0].text;
    writeFileSync(outPath, code);
    totalIn += source.length;
    totalOut += code.length;
    console.log(
      `${bundle.files.join(' + ')} (bundled) → ${bundle.out} (${source.length} → ${code.length} bytes)`
    );
    continue;
  }

  const combined = bundle.files
    .map((name) => readFileSync(resolve(jsDir, name), 'utf8'))
    .join('\n');

  const { code } = transformSync(combined, {
    loader: 'js',
    minify: true,
    target: 'es2018',
  });

  writeFileSync(outPath, code);
  totalIn += combined.length;
  totalOut += code.length;
  console.log(
    `${bundle.files.join(' + ')} → ${bundle.out} (${combined.length} → ${code.length} bytes)`
  );
}

console.log(`Wrote ${BUNDLES.length} bundles (${totalIn} → ${totalOut} bytes)`);
