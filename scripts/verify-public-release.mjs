import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const required = [
  "LICENSE",
  "README.md",
  "TESTING.md",
  "THIRD_PARTY_NOTICES.md",
  "blockout_companion.py",
  "Start Blockout.cmd",
  "Setup Blockout.cmd",
  "textures/asset-manifest.base.json",
  "assets/sunburst-base.wad",
  "tools/install-sdhlt.ps1",
  "tools/SDHLT_LICENSE.md",
];

for (const file of required) await access(path.join(root, file));

const manifest = JSON.parse(await readFile(path.join(root, "textures", "asset-manifest.base.json"), "utf8"));
if (!Array.isArray(manifest.textures) || manifest.textures.length !== 43) {
  throw new Error(`Expected 43 public CC0 materials, found ${manifest.textures?.length ?? "none"}.`);
}
if (manifest.textures.some((texture) =>
  texture.source === "user" || String(texture.name || "").toUpperCase().startsWith("USR_")
)) {
  throw new Error("The public manifest contains a local user import.");
}

const stock = [
  "C1A0_LABW3", "CSTRIKE_WR4RGH", "CSTRIKE_ME4METL",
  "CSTRIKE_CH3TILE", "CSTRIKE_FP2DARK", "BCRATE02", "C1A1_CRATE1",
];
for (const name of stock) {
  await access(path.join(root, "textures", "previews", `${name}.svg`));
  try {
    await access(path.join(root, "textures", "previews", `${name}.png`));
    throw new Error(`Game-derived preview ${name}.png must not be distributed.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function filesUnder(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? filesUnder(path.join(folder, entry.name))
    : [path.join(folder, entry.name)]))).flat();
}
const publicFiles = await filesUnder(path.join(root, "public"));
if (publicFiles.some((file) => /\.wad$/i.test(file))) {
  throw new Error("The public web build must not contain Valve or local WAD archives.");
}

const wad = await readFile(path.join(root, "assets", "sunburst-base.wad"));
if (wad.subarray(0, 4).toString("ascii") !== "WAD3") throw new Error("The clean custom material archive is invalid.");
if (wad.readInt32LE(4) !== 53) throw new Error(`Expected 53 clean WAD textures, found ${wad.readInt32LE(4)}.`);

console.log("Public-release checks passed: clean manifest, original previews, complete companion, and valid 53-texture WAD.");
