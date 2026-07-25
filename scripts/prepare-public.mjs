import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public");
const previewSource = path.join(root, "textures", "previews");
const previewOutput = path.join(output, "textures", "previews");

await rm(output, { recursive: true, force: true });
await mkdir(previewOutput, { recursive: true });
for (const file of ["index.html", "app.js", "styles.css"]) {
  await cp(path.join(root, file), path.join(output, file));
}
for (const file of await readdir(previewSource)) {
  if (!file.toUpperCase().startsWith("USR_") && file.toLowerCase().endsWith(".png")) {
    await cp(path.join(previewSource, file), path.join(previewOutput, file));
  }
}
console.log("Prepared hosted browser assets without local binaries, configuration, WADs, or user imports.");
