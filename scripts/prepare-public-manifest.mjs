import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "textures", "asset-manifest.json");
const destination = path.join(root, "textures", "asset-manifest.base.json");
const manifest = JSON.parse(await readFile(source, "utf8"));

manifest.pack = "Blockout CC0 Materials 1";
manifest.license = "CC0-1.0";
manifest.textures = manifest.textures.filter((texture) =>
  texture &&
  texture.source !== "user" &&
  !String(texture.name || "").toUpperCase().startsWith("USR_")
);

await writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Prepared ${manifest.textures.length} public CC0 material records.`);
