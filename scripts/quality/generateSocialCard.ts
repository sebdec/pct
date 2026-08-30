import { readFile } from "node:fs/promises";

import sharp from "sharp";

const width = 1200;
const height = 630;
const mark = await sharp(await readFile("src/assets/pct-mark.svg"))
  .resize(196, 196)
  .png()
  .toBuffer();
const copy = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <text x="156" y="392" fill="#ffffff" font-family="Montserrat, Arial, sans-serif" font-size="76" font-weight="700" letter-spacing="-2">Pacific Crest Trail</text>
    <text x="158" y="478" fill="#91e6a5" font-family="Montserrat, Arial, sans-serif" font-size="58" font-weight="500">2026</text>
  </svg>
`);

await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: "#191d27",
  },
})
  .composite([
    { input: mark, left: 156, top: 106 },
    { input: copy, left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9, palette: true })
  .toFile("public/social-card.png");

console.log("Generated public/social-card.png (1200 × 630).");
