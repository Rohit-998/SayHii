import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { zipSync } from "fflate";

const excluded = new Set(["node_modules", ".next", ".preview", ".git", ".env.local", ".env.production.local", "tsconfig.tsbuildinfo"]);
const entries = {};
async function collect(directory, prefix = "sayhii") {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(item.name) || item.name.endsWith(".tsbuildinfo") || (item.name.startsWith(".env") && item.name !== ".env.example")) continue;
    const path = join(directory, item.name);
    const key = `${prefix}/${item.name}`;
    if (item.isDirectory()) await collect(path, key);
    else if (item.isFile()) entries[key] = new Uint8Array(await readFile(path));
  }
}
await collect(process.cwd());
const output = resolve("../outputs");
await mkdir(output, { recursive: true });
const archive = zipSync(entries, { level: 6 });
await writeFile(join(output, "SayHii-source.zip"), archive);
console.log(`Packaged ${Object.keys(entries).length} source files (${Math.round(archive.length / 1024)} KB). No dependencies, build caches, or local environment files included.`);
