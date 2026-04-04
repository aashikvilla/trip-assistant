#!/usr/bin/env node
// Generates minimal valid PNG placeholder icons for PWA manifest
const fs = require("fs");
const path = require("path");

function createMinimalPNG(size) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xffffffff;
    const table = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  // IHDR: width, height, bit depth 8, color type 2 (RGB), compression 0, filter 0, interlace 0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw image data: each row has a filter byte (0) + RGB pixels
  // Color: indigo #6366f1 = 99, 102, 241
  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter none
    for (let x = 0; x < size; x++) {
      raw[y * rowSize + 1 + x * 3] = 99;
      raw[y * rowSize + 2 + x * 3] = 102;
      raw[y * rowSize + 3 + x * 3] = 241;
    }
  }

  const zlib = require("zlib");
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

const iconsDir = path.join(__dirname, "../public/icons");
fs.mkdirSync(iconsDir, { recursive: true });

for (const [name, size] of [["logo.png", 192], ["logo.png", 512], ["logo.png", 512]]) {
  fs.writeFileSync(path.join(iconsDir, name), createMinimalPNG(size));
  console.log(`Created ${name} (${size}x${size})`);
}
