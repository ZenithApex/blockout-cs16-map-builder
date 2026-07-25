"use strict";

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "textures", "sources");
const PREVIEW_DIR = path.join(ROOT, "textures", "previews");
const argumentValue = (name) => {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : "";
};
const defaultManifest = fs.existsSync(path.join(ROOT, "textures", "asset-manifest.json"))
  ? path.join(ROOT, "textures", "asset-manifest.json")
  : path.join(ROOT, "textures", "asset-manifest.base.json");
const MANIFEST_FILE = path.resolve(argumentValue("manifest") || defaultManifest);
const OUTPUT_WAD = path.resolve(argumentValue("output") || path.join(ROOT, "sunburst.wad"));
const CORE_TEXTURES = [
  "SUN_FELT", "SUN_KNIT", "SUN_RIBBON", "SUN_FACE", "SUN_WALL",
  "SUN_METAL", "SUN_TILE", "SUN_FLOOR", "SUN_CRATE", "SUN_SUPPLY"
];
const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
const TEXTURES = [...CORE_TEXTURES, ...manifest.textures.map((texture) => texture.name)];
const SIZE = 256;

function align4(value) {
  return (value + 3) & ~3;
}

function makePalette() {
  const palette = Buffer.alloc(256 * 3);
  for (let index = 0; index < 256; index += 1) {
    const r = ((index >> 5) & 7) * 255 / 7;
    const g = ((index >> 2) & 7) * 255 / 7;
    const b = (index & 3) * 255 / 3;
    palette[index * 3] = Math.round(r);
    palette[index * 3 + 1] = Math.round(g);
    palette[index * 3 + 2] = Math.round(b);
  }
  return palette;
}

function indexRgb(rgb) {
  const indexed = Buffer.alloc(rgb.length / 3);
  for (let source = 0, target = 0; source < rgb.length; source += 3, target += 1) {
    indexed[target] = ((rgb[source] >> 5) << 5) | ((rgb[source + 1] >> 5) << 2) | (rgb[source + 2] >> 6);
  }
  return indexed;
}

function resizedRgb(image, size) {
  const output = Buffer.alloc(size * size * 3);
  const crop = Math.min(image.width, image.height);
  const offsetX = (image.width - crop) / 2;
  const offsetY = (image.height - crop) / 2;
  const sourcePixel = (x, y, channel) => image.data[(y * image.width + x) * 4 + channel];

  for (let y = 0; y < size; y += 1) {
    const sourceY = Math.max(0, Math.min(image.height - 1, offsetY + (y + .5) * crop / size - .5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const fy = sourceY - y0;
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.max(0, Math.min(image.width - 1, offsetX + (x + .5) * crop / size - .5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const fx = sourceX - x0;
      const target = (y * size + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const top = sourcePixel(x0, y0, channel) * (1 - fx) + sourcePixel(x1, y0, channel) * fx;
        const bottom = sourcePixel(x0, y1, channel) * (1 - fx) + sourcePixel(x1, y1, channel) * fx;
        output[target + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return output;
}

function previewPng(rgb, size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let source = 0, target = 0; source < rgb.length; source += 3, target += 4) {
    rgba[target] = rgb[source];
    rgba[target + 1] = rgb[source + 1];
    rgba[target + 2] = rgb[source + 2];
    rgba[target + 3] = 255;
  }
  return PNG.sync.write({ width: size, height: size, data: rgba }, { colorType: 2 });
}

function writeName(buffer, offset, name) {
  buffer.fill(0, offset, offset + 16);
  buffer.write(name, offset, Math.min(15, Buffer.byteLength(name)), "ascii");
}

function buildMiptex(name, image, palette) {
  const sizes = [SIZE, SIZE / 2, SIZE / 4, SIZE / 8];
  const mips = [];
  for (const size of sizes) mips.push(indexRgb(resizedRgb(image, size)));

  const headerSize = 40;
  const pixelsSize = mips.reduce((sum, mip) => sum + mip.length, 0);
  // GoldSrc miptex records carry two trailing zero bytes after the 256-color
  // palette. Keeping the record 4-byte aligned is required by the runtime,
  // even though some compilers will accept an unpadded WAD lump.
  const output = Buffer.alloc(headerSize + pixelsSize + 2 + palette.length + 2);
  writeName(output, 0, name);
  output.writeUInt32LE(SIZE, 16);
  output.writeUInt32LE(SIZE, 20);

  let cursor = headerSize;
  mips.forEach((mip, level) => {
    output.writeUInt32LE(cursor, 24 + level * 4);
    mip.copy(output, cursor);
    cursor += mip.length;
  });
  output.writeUInt16LE(256, cursor);
  palette.copy(output, cursor + 2);
  return output;
}

async function main() {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const palette = makePalette();
  const lumps = [];

  for (const name of TEXTURES) {
    const editableSource = path.join(SOURCE_DIR, `${name}.png`);
    const sourcePath = fs.existsSync(editableSource)
      ? editableSource
      : path.join(PREVIEW_DIR, `${name}.png`);
    if (!fs.existsSync(sourcePath)) throw new Error(`Missing texture source: ${sourcePath}`);
    const image = PNG.sync.read(fs.readFileSync(sourcePath));
    const preview = resizedRgb(image, SIZE);
    fs.writeFileSync(path.join(PREVIEW_DIR, `${name}.png`), previewPng(preview, SIZE));
    lumps.push({ name, data: buildMiptex(name, image, palette) });
  }

  let dataOffset = 12;
  for (const lump of lumps) {
    dataOffset = align4(dataOffset);
    lump.offset = dataOffset;
    dataOffset += lump.data.length;
  }
  const directoryOffset = align4(dataOffset);
  const output = Buffer.alloc(directoryOffset + lumps.length * 32);
  output.write("WAD3", 0, "ascii");
  output.writeInt32LE(lumps.length, 4);
  output.writeInt32LE(directoryOffset, 8);

  lumps.forEach((lump, index) => {
    lump.data.copy(output, lump.offset);
    const entry = directoryOffset + index * 32;
    output.writeInt32LE(lump.offset, entry);
    output.writeInt32LE(lump.data.length, entry + 4);
    output.writeInt32LE(lump.data.length, entry + 8);
    output[entry + 12] = 0x43;
    output[entry + 13] = 0;
    output.writeInt16LE(0, entry + 14);
    writeName(output, entry + 16, lump.name);
  });

  fs.mkdirSync(path.dirname(OUTPUT_WAD), { recursive: true });
  fs.writeFileSync(OUTPUT_WAD, output);
  console.log(`Built ${OUTPUT_WAD} (${output.length} bytes, ${lumps.length} embedded textures)`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
