import { access, copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");

const serverEntry = resolve(dist, "server", "index.js");
try {
  await access(serverEntry);
} catch {
  await copyFile(resolve(dist, "server", "index.mjs"), serverEntry);
}
await mkdir(resolve(dist, ".openai"), { recursive: true });
await copyFile(resolve(root, ".openai", "hosting.json"), resolve(dist, ".openai", "hosting.json"));

console.log("Prepared the Sites vinext entrypoint and project metadata.");
