import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const heroDir = path.join(process.cwd(), 'static/images/hero');

const files = (await readdir(heroDir)).filter((f) => /\.(jpe?g|png)$/i.test(f));

for (const file of files) {
  const base = path.join(heroDir, path.parse(file).name);
  const input = `${base}${path.extname(file)}`;

  await sharp(input)
    .webp({ quality: 82, effort: 4 })
    .toFile(`${base}.webp`);

  const meta = await sharp(input).metadata();
  console.log(`${file} → ${meta.width}x${meta.height}`);
}

console.log(`Converted ${files.length} hero image(s) to WebP.`);
