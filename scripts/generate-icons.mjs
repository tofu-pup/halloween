// Dependency-free PNG generation for install/home-screen icons.
import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";

const glyphs = [
  ["111", "101", "101", "101", "111"],
  ["010", "110", "010", "010", "111"],
  ["111", "001", "111", "001", "111"],
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

async function makeIcon(size, filename, maskable = false) {
  const rows = Buffer.alloc(size * (1 + size * 4));
  const scale = size / 512;
  const unit = maskable ? 18 : 22;
  const left = (512 - 11 * unit) / 2;
  const top = 199;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x / scale, py = y / scale;
      let color = [20, 22, 18];
      if (!maskable && px >= 87 && px <= 425 && py >= 87 && py <= 425 && (px < 91 || px > 421 || py < 91 || py > 421)) color = [141, 146, 126];
      for (let g = 0; g < glyphs.length; g++) {
        const gx = Math.floor((px - left - g * unit * 4) / unit);
        const gy = Math.floor((py - top) / unit);
        if (gx >= 0 && gx < 3 && gy >= 0 && gy < 5 && glyphs[g][gy][gx] === "1") color = [219, 215, 200];
      }
      if (px >= 180 && px < 332 && py >= 348 && py < 358) color = [199, 74, 59];
      const offset = y * (1 + size * 4) + 1 + x * 4;
      rows.set([...color, 255], offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
  await writeFile(new URL(`../assets/${filename}`, import.meta.url), png);
}

await Promise.all([
  makeIcon(192, "icon-192.png"),
  makeIcon(512, "icon-512.png"),
  makeIcon(512, "icon-maskable.png", true),
]);
console.log("Generated three local PWA icons.");
