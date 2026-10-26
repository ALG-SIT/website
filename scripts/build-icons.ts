import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = await readFile('public/favicon.svg');
async function png(size: number, background = false) {
  const image = sharp(source, { density: 384 }).resize(size, size);
  return (background ? image.flatten({ background: '#ffffff' }) : image)
    .png()
    .toBuffer();
}

await writeFile('public/favicon-96x96.png', await png(96));
await writeFile('public/apple-touch-icon.png', await png(180, true));

// ICOの各ディレクトリエントリに、透過PNGを格納する。
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => png(size)));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile('public/favicon.ico', Buffer.concat([header, ...images]));
console.log('faviconのPNG・ICO・Apple Touch Iconを生成しました');
