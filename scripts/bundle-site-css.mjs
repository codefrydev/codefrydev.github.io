/**
 * Bundles and minifies global CSS into static/css/site.min.css.
 *
 * Concat order preserves the cascade:
 *   1. theme-tokens     — CSS custom properties
 *   2. modern-light-theme
 *   3. modern-dark-theme
 *   4. modern-glass-theme
 *   5. home-tailwind    — Tailwind utilities (must come after theme vars)
 *   6. accessibility    — overrides that sit on top of everything
 *
 * Run: npm run build:css (invoked automatically after Tailwind step)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transform } from 'lightningcss';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');

const SOURCE_FILES = [
  resolve(root, 'assets/css/theme-tokens.css'),
  resolve(root, 'assets/css/modern-light-theme.css'),
  resolve(root, 'assets/css/modern-dark-theme.css'),
  resolve(root, 'assets/css/modern-glass-theme.css'),
  resolve(root, 'static/css/home-tailwind.css'),   // Tailwind output (built first)
  resolve(root, 'static/css/accessibility.css'),
];

const OUT_FILE = resolve(root, 'static/css/site.min.css');

const combined = SOURCE_FILES.map(f => readFileSync(f, 'utf8')).join('\n');

const { code } = transform({
  filename: 'site.css',
  code: Buffer.from(combined),
  minify: true,
});

writeFileSync(OUT_FILE, code);
console.log(`Wrote ${(code.length / 1024).toFixed(1)} KB → ${OUT_FILE}`);
