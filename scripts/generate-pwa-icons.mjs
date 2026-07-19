// One-off script to rasterize public/icons/app-icon.svg into the PNG sizes the PWA manifest needs.
// Run with: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Square source (80x80) with its own rounded-square background baked in, already
// inset enough to survive a maskable circular crop - so every size below renders
// the same source at full bleed, no extra padding/background compositing needed.
const svg = readFileSync(new URL('../public/icons/app-icon.svg', import.meta.url));

async function render(size, outPath) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(outPath, import.meta.url)));
}

await render(192, '../public/icons/pwa-192x192.png');
await render(512, '../public/icons/pwa-512x512.png');
await render(512, '../public/icons/maskable-512x512.png');

console.log('PWA icons written to public/icons/');
