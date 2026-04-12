import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

// Generate 192x192 PNG
await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(join(publicDir, 'icon-192.png'));

console.log('✓ Generated icon-192.png');

// Generate 512x512 PNG
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'icon-512.png'));

console.log('✓ Generated icon-512.png');

// Generate Apple touch icon (180x180)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('✓ Generated apple-touch-icon.png');

console.log('\nIcons generated successfully!');
