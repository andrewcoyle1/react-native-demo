/**
 * Generates the light-mode variant of the dashboard's backdrop artwork.
 *
 * The alternate UI lays a photograph behind its content (see
 * `src/components/alt/screen-background.tsx`). The source is a bright
 * monochrome motion blur, which reads as a band of light over the dark page —
 * and as nothing at all over the light one, where "brighter than white" does
 * not exist. Inverting it turns that band of light into a band of shadow,
 * which is the same gesture the other way up.
 *
 * Run this rather than editing the output by hand, so the relationship between
 * the two files stays a stated transform instead of a pair of assets that
 * happen to look related:
 *
 *   npm run backdrop:variants
 *
 * `jpeg-js` is pure JavaScript with no dependencies of its own, deliberately:
 * this is the repository's only image-processing step, and it is not worth a
 * native toolchain that every contributor then has to be able to build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import jpeg from 'jpeg-js';

const here = dirname(fileURLToPath(import.meta.url));
const images = resolve(here, '..', 'assets', 'images');

const SOURCE = join(images, 'dashboard-backdrop.jpg');
const OUTPUT = join(images, 'dashboard-backdrop-light.jpg');

/** Matches the source's own encoding closely enough to stay a small file. */
const QUALITY = 82;

function invert(source) {
  const { width, height, data } = jpeg.decode(readFileSync(source), {
    useTArray: true,
  });

  // RGBA, four bytes per pixel. Alpha is left alone: inverting it would turn
  // an opaque photograph into an invisible one.
  const inverted = Buffer.from(data);
  for (let i = 0; i < inverted.length; i += 4) {
    inverted[i] = 255 - inverted[i];
    inverted[i + 1] = 255 - inverted[i + 1];
    inverted[i + 2] = 255 - inverted[i + 2];
  }

  return { width, height, data: inverted };
}

function meanLuminance({ data }) {
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Rec. 601 luma, which is what "how bright does this look" means here.
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

const source = jpeg.decode(readFileSync(SOURCE), { useTArray: true });
const light = invert(SOURCE);

writeFileSync(OUTPUT, jpeg.encode(light, QUALITY).data);

console.log(`source ${SOURCE}`);
console.log(`  ${source.width}x${source.height}, mean luma ${meanLuminance(source).toFixed(1)}`);
console.log(`wrote  ${OUTPUT}`);
console.log(`  ${light.width}x${light.height}, mean luma ${meanLuminance(light).toFixed(1)}`);
