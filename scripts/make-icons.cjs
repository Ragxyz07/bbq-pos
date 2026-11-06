const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, r, g, b) {
  // A clean solid/patterned PNG generator using uncompressed IDAT or zlib
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(2, 9); // Truecolor (RGB)
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines with a circular grill/flame colored pattern
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;

  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte: 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        // Inner circle fire grill gradient
        const factor = 1 - (dist / radius);
        const red = Math.min(255, Math.floor(220 + 35 * factor));
        const green = Math.min(255, Math.floor(60 + 120 * factor));
        const blue = Math.min(255, Math.floor(20 + 20 * factor));
        rawData.writeUInt8(red, offset++);
        rawData.writeUInt8(green, offset++);
        rawData.writeUInt8(blue, offset++);
      } else {
        // Dark outer background #0d0f15
        rawData.writeUInt8(13, offset++);
        rawData.writeUInt8(15, offset++);
        rawData.writeUInt8(21, offset++);
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcValue = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcValue, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, 234, 88, 12));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, 234, 88, 12));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, 234, 88, 12));
console.log('Generated PNG icons successfully');
